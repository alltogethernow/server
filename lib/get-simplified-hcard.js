const Microformats = require('microformat-node')
const axios = require('axios')

const getHCard = async url => {
  const { data: html } = await axios.get(url, {
    headers: {
      accept: 'text/html, application/xhtml+xml, application/xml',
    },
  })

  const options = {
    html,
    baseUrl: url,
    // filters: ['h-card'],
  }

  const data = await Microformats.getAsync(options)

  const hCard = data.items.find(item => item.type[0] === 'h-card')

  let user = {
    url: null,
    name: null,
    email: null,
    photo: null,
  }

  if (hCard && hCard.properties) {
    const p = hCard.properties
    if (p.name && p.name[0]) {
      user.name = p.name[0]
    }
    if (p.url && p.url[0]) {
      user.url = p.url[0]
    }
    if (p.email && p.email[0]) {
      user.email = p.email[0]
      if (user.email.startsWith('mailto:')) {
        user.email = user.email.substr(7)
      }
    }
    if (p.photo && p.photo[0]) {
      user.photo = p.photo[0]
    }
  }

  return user
}

module.exports = getHCard
