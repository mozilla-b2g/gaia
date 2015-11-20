'use strict';
/* exported MyJsonAuth */

var MyJsonAuth = {
  MOD_NAME: 'myjson',
  init() {
    this.EVENT_END_OF_AUTH = this.MOD_NAME + 'endOfAuth';
    var url = '/js/auth_mod/myjson.html';
    this.browserFrame = document.createElement('iframe');
    this.browserFrame.classList.add('sup-oauth2-browser');
    this.browserFrame.setAttribute('mozbrowser', true);
    this.browserFrame.setAttribute('src', url);
    this.browserFrame.addEventListener('mozbrowserlocationchange',
      this._onLocationChange.bind(this));
  },

  show(oauthWindow) {
    return new Promise((resolve, error) => {
      var handleEndOfAuth = event => {
        window.removeEventListener(this.EVENT_END_OF_AUTH, handleEndOfAuth);
        this.oauthWindow.removeChild(this.browserFrame);
        if (event.detail.error) {
          alert(event.detail.error);
          error(event.detail.error);
        } else {
          resolve(event.detail.token);
        }
      };
      window.addEventListener(this.EVENT_END_OF_AUTH, handleEndOfAuth);

      this.oauthWindow = oauthWindow;
      this.oauthWindow.appendChild(this.browserFrame);
    });
  },

  _onLocationChange(event) {
    var url = new URL(event.detail);
    if (url.searchParams.has('token')) {
      var myJsonUrl = 'https://api.myjson.com/bins/' +
        url.searchParams.get('token');

      var xmlhttp = new XMLHttpRequest();
      xmlhttp.open('get', myJsonUrl, false);
      xmlhttp.setRequestHeader('Accept', 'application/json');
      xmlhttp.send(null);
      if (xmlhttp.status !== 200) {
        const ERROR_MSG = 'Incorrect token: http status(1)';
        alert(ERROR_MSG);
        window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
          detail: {error: ERROR_MSG}
        }));
        return;
      }
      try{
        JSON.parse(xmlhttp.responseText);
        window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
          detail: {token: myJsonUrl}
        }));
      }catch(e){
        const ERROR_MSG = 'Incorrect token: parsing error(2)';
        alert(ERROR_MSG);
        window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
          detail: {error: ERROR_MSG}
        }));
      }
    } else {
      //const ERROR_MSG = 'Incorrect token: no token param(3)';
      //alert(ERROR_MSG);
      //window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
      //  detail: {error: ERROR_MSG}
      //}));
    }
  }
};
