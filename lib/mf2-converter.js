const { camelCase } = require('lodash')

const alwaysArrays = [
  'category',
  'featured',
  'photo',
  'video',
  'audio',
  'like-of',
  'repost-of',
  'in-reply-to',
  'bookmark-of',
  'quotation-of',
  'syndication',
]

/**
 * Raw jf2 converter
 * @param {object} item Mf2 object
 */
const mf2ToJf2 = item => {
  let jf2 = {}

  // Convert type
  if (item.type) {
    jf2.type = item.type[0].replace('h-', '')
  }

  // Add uid
  if (item.properties.url) {
    jf2.uid = item.properties.url[0]
  }

  // Convert properties
  for (const property in item.properties) {
    if (item.properties.hasOwnProperty(property)) {
      if (Array.isArray(item.properties[property])) {
        let arrayValue = item.properties[property].map(value => {
          if (typeof value === 'string') {
            return value
          }

          if (typeof value === 'object') {
            // Handle nested mf2
            if (value && value.type && value.properties) {
              return mf2ToJf2(value)
            }

            // Handle photos with alts
            if (property === 'photo' && value.value) {
              return value.value
            }

            // Handle content
            if (property === 'content' && value.html && value.value) {
              return {
                html: value.html,
                text: value.value,
              }
            }
          }
        })
        if (arrayValue.length === 1) {
          jf2[property] = arrayValue[0]
        } else {
          jf2[property] = arrayValue
        }
      } else {
        console.warn(
          property + ' property is not an array:',
          item.properties[property]
        )
      }
    }
  }

  // Convert references to jf2
  if (item.references) {
    jf2.references = {}
    for (const ref in item.references) {
      if (item.references.hasOwnProperty(ref)) {
        const mf2 = item.references[ref]
        jf2.references[ref] = mf2ToJf2(mf2)
      }
    }
    if (Object.keys(jf2.references).length === 0) {
      delete jf2.references
    }
  }

  // If there are children they should be expanded
  if (item.children) {
    // TODO: Handle expanding children
    jf2.children = item.children
  }

  // Delete unneeded properties
  // delete jf2['post-status']
  // delete jf2['mp-slug']
  // delete jf2.visibility
  // delete jf2['syndicate-to']

  return jf2
}

/**
 * Convert mf2 object to a Together Server friendly jf2 form
 * @param {object} mf2 Mf2 object
 */
const from = mf2 => {
  let jf2 = mf2ToJf2(mf2)
  jf2._is_read = true
  jf2._id = jf2.uid
  // console.log('Starting conversion')
  // console.log(mf2)

  for (const key in jf2) {
    if (jf2.hasOwnProperty(key)) {
      let value = jf2[key]

      // Make sure certain items are arrays
      if (!Array.isArray(value) && alwaysArrays.includes(key)) {
        value = [value]
        jf2[key] = value
      }
      // Camelcase for use in graphql
      if (!key.startsWith('_')) {
        delete jf2[key]
        jf2[camelCase(key)] = value
      }
    }
  }

  // console.log(jf2)

  return jf2
}

const to = jf2 => {
  const mf2 = {}
  return mf2
}

module.exports = { to, from }
