function getConfig() {
  return {
    apiHost: 'https://perfect-elk.ru'
  }
}


function setCookie(name, value, options = {}) {

    options = {
      path: '/',
      domain: document.location.hostname,
      ...options
    }
  
    if (options.expires instanceof Date) {
      options.expires = options.expires.toUTCString()
    }
  
    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value)
  
    for (let optionKey in options) {
      updatedCookie += "; " + optionKey
      let optionValue = options[optionKey]
      if (optionValue !== true) {
        updatedCookie += "=" + optionValue
      }
    }
  
    document.cookie = updatedCookie
}

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ))
    return matches ? decodeURIComponent(matches[1]) : undefined
}

function deleteCookie(name) {
    setCookie(name, "", {
      'max-age': -1
    })
}

function putToken(token) {
    setCookie('myCustomCssToken', token, {
      'max-age': 60*60*24*365,
      secure: true
    })
}


async function request(path, headers) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getConfig().apiHost}/api/v2${path}`)
    for (let key in headers) {
      xhr.setRequestHeader(key, headers[key])
    }
    const formData = new FormData
    formData.append('host', window.location.hostname)
    xhr.send(formData)
    xhr.onload = function() {
      resolve(JSON.parse(xhr.response))
    }
  })
  
}


async function getCss(token) {
  const response = await request('/custom_css/get', {
    'auth-token': token
  })
  return response.data.message.css
}


let el = null
function applyCss(css) {
    if (!css) {
        return
    }
    if (el !== null) {
      document.body.removeChild(el)
    }
    el = document.createElement('style')
    el.innerHTML = css
    document.body.appendChild(el)
}

async function init() {
  let token = getCookie('myCustomCssToken')
  if (!token) {
    token = localStorage.getItem('myCustomCssToken')
  }
  if (!token) {
    return
  }
  const css = await getCss(token)
  applyCss(css)
}

chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    switch (request.action) {
        case 'token':
            if (request.token === getCookie('myCustomCssToken')) {
              break
            }
            putToken(request.token)
            localStorage.setItem('myCustomCssToken', request.token)
            const css = await getCss(request.token)
            applyCss(css)
            break
        case 'get-token':
          sendResponse({
            token: getCookie('myCustomCssToken')
          })
    }
    return true
})

init()
