const slugify = require('@sindresorhus/slugify')
const url = window.location.href

// current url splitting is based on opening each static page as OS file, not by being served from a server; split list would be different, including assets path. update when pushing to server.

// check which publisher to get correct title, ):
const pub = url.split('/')[url.split('/').length - 3].split('.')[0]
console.log(pub)

function get_title (pub) {
  const query = {
    'tokens': {
      "title": true,
      "author": true,
      "tags": true,
      "body": true
    },
    size: 3
  }

  if (pub === 'amateurcities') {
    const title = document.querySelector('meta[property="og:title"]').content

    query['article_slug'] = slugify(title),
    query['article_publisher'] = 'amateur-cities'

    return query
  } else if (pub === 'onlineopen') {
    const title = document.querySelector('meta[property="og:title"]').content

    query['article_slug'] = slugify(title),
    query['article_publisher'] = 'online-open'

    return query
  } else if (pub === 'openset') {
    const title = document.querySelector('.article-title').innerText
    console.log(title)

    query['article_slug'] = slugify(title),
    query['article_publisher'] = 'open-set-reader'

    return query
  }
}

const query = get_title(pub)
console.log(query)

async function get_article (query) {
  const response = await fetch('https://mhp.andrefincato.info/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  })

  if (response.ok) {
    let data = await response.json()
    return data
  } else {
    return response.status
  }
}

function create_block (data) {

}

; // to make sure anon async func works

//-- main func
(async () => {
  try {
    const article = await get_article(query) 
    console.log(article)

    // add to page func

  } catch (e) {
    throw e
  }
})()
