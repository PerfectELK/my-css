const app = new Vue({
    el: '#app',
    data() {
        return {
            apiHost: 'https://electrobaza.client:8000',
            authToken: null,
            activeSiteHost: null,
            parentTabId: null,
            css: null,
        }
    },
    computed: {
        isActivateFrame() {
            if (this.authToken === null) {
                return false
            }
            if (this.authToken === false || this.authToken === undefined) {
                return true
            }
            return false
        },
        authUrl() {
            return this.apiHost + '?oauth=true'
        }
    },
    created() {
        const token = this.getCookie('myCustomCssToken')
        if (token) {
            this.authToken = token
        }

        chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
            this.activeSiteHost = (new URL(tabs[0].url)).hostname
            this.parentTabId = tabs[0].id
            this.registerListeners()
        });
    },
    beforeDestroy() {
        window.removeEventListener('message', this.token)
    },
    methods: {
        putToken(token) {
            this.setCookie('myCustomCssToken', token, {'max-age': 60*60*24*365})
        },
        sendTokenToParent(token) {
            chrome.tabs.sendMessage(this.parentTabId, {
                action: 'token',
                token: token
            })
        },
        token(e) {
            const data = e.data
            if (data.action === 'token') {
                this.authToken = data.data.token
                this.putToken(this.authToken)
                this.sendTokenToParent(this.authToken)
                this.getCss()
            }
        }, 
        registerListeners() {
            window.addEventListener('message', this.token, false)
            
            if (this.authToken) {
                this.sendTokenToParent(this.authToken)
                this.getCss()
                return
            }
            
            chrome.tabs.sendMessage(this.parentTabId, {
                action: 'get-token'
            }, (response) => {
                if (response.token || response.token === undefined) {
                    this.authToken = response.token
                    this.putToken(response.token)
                }
            })
        },
        setCookie(name, value, options = {}) {
            options = {
              path: '/',
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
        },
        getCookie(name) {
            let matches = document.cookie.match(new RegExp(
              "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
            ))
            return matches ? decodeURIComponent(matches[1]) : undefined
        },
        async request(path, headers, data = {}) {
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', `${this.apiHost}/api/v2${path}`)
              for (let key in headers) {
                xhr.setRequestHeader(key, headers[key])
              }
              const formData = new FormData
              formData.append('host', this.activeSiteHost)
              for (let key in data) {
                  formData.append(key, data[key])
              }
              xhr.send(formData)
              xhr.onload = function() {
                resolve(JSON.parse(xhr.response))
              }
            })
            
        },
        async getCss() {
            const response = await this.request('/custom_css/get', {
              'auth-token': this.authToken
            })
            this.css = response.data.message.css
        },
        async saveCss() {
            const response = await this.request('/custom_css/set', {
                'auth-token': this.authToken
            }, {
                css: this.css
            })
        }
    }
})