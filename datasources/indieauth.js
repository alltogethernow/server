const { DataSource } = require('apollo-datasource')
const getAuth = require('../lib/indieauth')

const scopes = [
  'post',
  'create',
  'delete',
  'update',
  'read',
  'follow',
  'mute',
  'block',
  'channels',
]

class IndieAuth extends DataSource {
  initialize(config) {
    this.context = config.context
  }

  async getAuthUrl(url) {
    const auth = getAuth()
    auth.options.me = url
    const authUrl = await auth.getAuthUrl('code', scopes)
    console.log('Sending user to auth:', authUrl)
    return authUrl
  }

  async getToken(code, state) {
    const auth = getAuth()
    const valid = auth.validateState(state)
    if (!valid) {
      console.error('State not valid', state)
      return null
    }
    auth.options.me = valid.me
    const endpoints = await auth.getRelsFromUrl(valid.me, [
      'micropub',
      'microsub',
    ])
    try {
      const token = await auth.getToken(code)
      // Got token so should create a user here
      const user = {
        token,
        url: auth.options.me,
        microsubEndpoint: endpoints.microsub,
        micropubEndpoint: endpoints.micropub,
      }
      return user
    } catch (err) {
      console.error('[Error getting token]', err)
      return null
    }
  }
}

module.exports = IndieAuth
