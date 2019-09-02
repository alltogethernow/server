const { gql } = require('apollo-server')

const typeDefs = gql`
  type Follow {
    type: String!
    url: String!
  }

  type TimelineResult {
    channel: String!
    items: [Post]!
    after: String
    before: String
    source: Source
  }

  type PostContent {
    text: String
    html: String
  }

  type SearchResult {
    type: String!
    url: String!
    name: String!
    photo: String
    description: String
    author: PostAuthor
  }

  type Source {
    _id: ID!
    name: String!
  }

  type PostAuthor {
    type: String
    name: String
    url: String
    photo: String
  }

  type PostLocation {
    type: String
    name: String
    latitude: Float
    longitude: Float
    url: String
  }

  type Post {
    _id: ID
    _is_read: Boolean
    _source: String
    uid: String
    url: String
    postType: String
    type: String
    published: String
    name: String
    content: PostContent
    summary: String
    postStatus: String
    visibility: String
    category: [String]
    featured: [String]
    photo: [String]
    video: [String]
    audio: [String]
    likeOf: [String]
    repostOf: [String]
    inReplyTo: [String]
    bookmarkOf: [String]
    quotationOf: [String]
    syndication: [String]
    author: PostAuthor
    checkin: PostLocation
    location: PostLocation
    refs: [Post]
  }

  type PostConnection {
    cursor: String!
    hasMore: Boolean!
    posts: [Post]!
  }

  type Channel {
    uid: ID!
    name: String!
    unread: Int
    _t_slug: String!
    _t_layout: String!
    _t_autoRead: Boolean!
    _t_infiniteScroll: Boolean!
    _t_unreadOnly: Boolean!
  }

  type UserSettings {
    likeSyndication: [String]!
    repostSyndication: [String]!
    noteSyndication: [String]!
  }

  type User {
    url: String!
    name: String
    photo: String
    # token: String
    hasMicrosub: Boolean!
    hasMicropub: Boolean!
    settings: UserSettings!
  }

  type LoginResponse {
    token: String!
    user: User!
  }

  type Subscription {
    timelineSubscription(
      channel: String!
      limit: Int
      before: String
      after: String
      source: String
      unreadOnly: Boolean
    ): TimelineResult!
  }

  type Query {
    channels: [Channel]
    following(channel: String!): [SearchResult]
    blocked(channel: String!): [SearchResult]
    muted(channel: String!): [SearchResult]
    # posts(channel: String!, limit: Int, before: String, after: String): [Post]!
    timeline(
      channel: String!
      limit: Int
      before: String
      after: String
      source: String
      unreadOnly: Boolean
    ): TimelineResult!
    search(query: String!): [SearchResult]!
    preview(url: String!): [Post]!
    user: User
    micropubPosts(
      postType: String
      limit: Int
      before: String
      after: String
      order: String
    ): TimelineResult!
    micropubQuery(query: String): String
  }

  type Mutation {
    getAuthUrl(url: String!): String
    login(code: String!, state: String!): LoginResponse!
    markPostRead(channel: String!, post: String!): Post!
    markPostUnread(channel: String!, post: String!): Post!
    removePost(channel: String!, post: String!): Post!
    mute(channel: String!, url: String!): Boolean!
    unmute(channel: String!, url: String!): Boolean!
    block(channel: String!, url: String!): Boolean!
    unblock(channel: String!, url: String!): Boolean!
    markChannelRead(channel: String!, post: String!): Channel!
    follow(channel: String!, url: String!): Boolean!
    unfollow(channel: String!, url: String!): Boolean!
    addChannel(name: String!): Channel!
    reorderChannels(channels: [String!]!): Boolean!
    removeChannel(channel: String!): Boolean!
    setUserSetting(key: String!, value: String!): Boolean!
    refetchPost(url: String!, post: String!): Post!
    updateChannel(
      uid: String!
      name: String
      unread: Int
      _t_slug: String
      _t_layout: String
      _t_autoRead: Boolean
      _t_infiniteScroll: Boolean
      _t_unreadOnly: Boolean
    ): Channel!
    micropubCreate(json: String!): String!
    micropubUpdate(url: String!, json: String!): String!
    micropubDelete(url: String!): Boolean!
    micropubUndelete(url: String!): Boolean!
  }
`
module.exports = typeDefs
