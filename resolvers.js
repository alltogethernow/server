const jwt = require('./lib/jwt')
const { PubSub, withFilter } = require('apollo-server')
const mf2Convert = require('./lib/mf2-converter')
const pubsub = new PubSub()

module.exports = {
  Query: {
    user: async (_, __, { user }) => {
      const userDefaults = {
        url: '',
        name: null,
        photo: null,
        hasMicropub: false,
        hasMicrosub: false,
        settings: {
          likeSyndication: [],
          repostSyndication: [],
          noteSyndication: [],
        },
      }
      const { url = '', name, photo, settings } = user

      // I don't know why, but I can't seem to spread or assign the user object for some reason
      const res = Object.assign({}, userDefaults, {
        url,
        name,
        photo,
        settings: Object.assign({}, userDefaults.settings, settings),
        hasMicropub: !!user.micropubEndpoint,
        hasMicrosub: !!user.microsubEndpoint,
      })

      return res
    },
    search: async (_, { query }, { dataSources }) =>
      await dataSources.microsub.search(query),
    preview: async (_, { url }, { dataSources }) =>
      await dataSources.microsub.preview(url),
    channels: async (_, __, { dataSources }) => {
      const channels = await dataSources.microsub.getAllChannels()
      return channels
    },
    following: async (_, { channel }, { dataSources }) => {
      return await dataSources.microsub.getFollowing(channel)
    },
    blocked: async (_, { channel }, { dataSources }) => {
      return await dataSources.microsub.getBlocked(channel)
    },
    muted: async (_, { channel }, { dataSources }) => {
      return await dataSources.microsub.getMuted(channel)
    },
    timeline: async (
      _,
      { channel, limit, before, after, source, unreadOnly },
      { dataSources }
    ) =>
      await dataSources.microsub.getTimeline({
        channel,
        limit,
        before,
        after,
        source,
        unreadOnly,
      }),
    micropubQuery: async (_, { query }, { dataSources }) => {
      const res = await dataSources.micropub.query(query)
      return JSON.stringify(res)
    },
    micropubPosts: async (_, queryParams, { dataSources }) => {
      let query = Object.assign({}, queryParams)
      if (query.postType) {
        query['post-type'] = query.postType
        delete query.postType
      }
      if (Object.keys(query).length === 0) {
        query = null
      }
      const res = await dataSources.micropub.querySource(query)
      const items = res.items.map(mf2Convert.from)
      return {
        items,
        channel: '_t_micropub-query',
        after: res.after,
        before: res.before,
      }
    },
  },
  Mutation: {
    markPostRead: async (_, { channel, post }, { dataSources }) => {
      const res = await dataSources.microsub.markPostRead(channel, post)
      return {
        _id: post,
        _is_read: res ? true : false,
      }
    },
    markPostUnread: async (_, { channel, post }, { dataSources }) => {
      const res = await dataSources.microsub.markPostUnread(channel, post)
      return {
        _id: post,
        _is_read: res ? false : true,
      }
    },
    removePost: async (_, { channel, post }, { dataSources }) => {
      const res = await dataSources.microsub.removePost(channel, post)
      return { _id: post }
    },
    refetchPost: async (_, { url, post }, __) => {
      const Mercury = require('@postlight/mercury-parser')
      const data = await Mercury.parse(url)
      let res = {
        _id: post,
      }
      if (data.content) {
        res.content = { html: data.content }
      }
      if (data.title) {
        res.name = data.title
      }
      if (data.lead_image_url) {
        const imageUrl = encodeURI(
          data.lead_image_url.replace('http://', '').replace('https://', '')
        )
        res.featured = [`https://images.weserv.nl/?url=${imageUrl}`]
      }

      return res
    },
    markChannelRead: async (_, { channel, post }, { dataSources }) => {
      await dataSources.microsub.markChannelRead(channel, post)
      return {
        uid: channel,
        unread: 0,
      }
    },
    mute: async (_, { channel, url }, { dataSources }) => {
      const res = await dataSources.microsub.mute(channel, url)
      return !!res
    },
    unmute: async (_, { channel, url }, { dataSources }) => {
      const res = await dataSources.microsub.unmute(channel, url)
      return !!res
    },
    follow: async (_, { channel, url }, { dataSources }) => {
      const res = await dataSources.microsub.follow(channel, url)
      return !!res
    },
    unfollow: async (_, { channel, url }, { dataSources }) => {
      const res = await dataSources.microsub.unfollow(channel, url)
      return !!res
    },
    addChannel: async (_, { name }, { dataSources }) => {
      const res = await dataSources.microsub.createChannel(name)
      return res
    },
    removeChannel: async (_, { channel }, { dataSources }) => {
      const res = await dataSources.microsub.deleteChannel(channel)
      return !!res
    },
    reorderChannels: async (_, { channels }, { dataSources }) => {
      const res = await dataSources.microsub.reorderChannels(channels)
      return !!res
    },
    updateChannel: async (_, channel, { dataSources }) => {
      for (const key in channel) {
        if (channel.hasOwnProperty(key)) {
          const value = channel[key]
          if (key === 'name') {
            // Need to rename the channel
            const res = await dataSources.microsub.renameChannel(
              channel.uid,
              value
            )
            if (res !== value) {
              throw new Error('Error renaming channel')
            }
          } else if (key.startsWith('_t_')) {
            // This is a setting to update
            const res = await dataSources.mongo.setChannelOption(
              channel.uid,
              key,
              value
            )
            if (!res) {
              throw new Error('Error updating channel setting')
            }
          }
        }
      }
      return channel
    },
    getAuthUrl: async (_, { url }, { dataSources }) => {
      const authUrl = dataSources.indieauth.getAuthUrl(url)
      return authUrl
    },
    login: async (_, { state, code }, { dataSources }) => {
      const loginData = await dataSources.indieauth.getToken(code, state)
      if (!loginData) {
        throw new Error('Error getting token')
      }
      const token = jwt.generate(loginData.url)
      const user = await dataSources.mongo.findOrCreateUser(token, loginData)
      return { token, user }
    },
    setUserSetting: async (_, { key, value }, { dataSources }) => {
      let updateVal = value
      try {
        updateVal = JSON.parse(value)
      } catch (err) {
        // Setting value wasn't json string, but that is probably fine
      }
      return dataSources.mongo.setOption(key, updateVal)
    },
    micropubCreate: async (_, { json }, { dataSources }) => {
      const postUrl = await dataSources.micropub.create(JSON.parse(json))
      return postUrl
    },
    micropubUpdate: async (_, { json, url }, { dataSources }) => {
      const postUrl = await dataSources.micropub.update(url, JSON.parse(json))
      return postUrl
    },
    micropubDelete: async (_, { url }, { dataSources }) => {
      const postUrl = await dataSources.micropub.delete(url)
      return !!postUrl
    },
    micropubUndelete: async (_, { url }, { dataSources }) => {
      const postUrl = await dataSources.micropub.undelete(url)
      return !!postUrl
    },
  },
  Subscription: {
    timelineSubscription: {
      resolve: async (
        payload,
        { channel, before, source, unreadOnly },
        context,
        _info
      ) => {
        if (!channel || !before) {
          return { channel, items: [] }
        }
        const Microsub = require('./datasources/microsub')
        const microsub = new Microsub()
        microsub.initialize({ context })
        const timeline = await microsub.getTimeline({
          channel,
          before,
          source,
          unreadOnly,
        })
        return timeline
        console.log(timeline)
        return { channel, before: timeline.before, items: timeline.items }
      },
      subscribe: () => pubsub.asyncIterator('TIMELINE_SUBSCRIPTION'),
    },
  },
}

setInterval(() => {
  pubsub.publish('TIMELINE_SUBSCRIPTION', null)
}, 1000 * 60)
