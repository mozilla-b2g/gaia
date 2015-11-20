'use strict';
/* exported DropboxAuth */

var DropboxAuth = {
  MOD_NAME: 'dropbox',
  init() {
    this.EVENT_END_OF_AUTH = this.MOD_NAME + 'endOfAuth';
    const DROPBOX_APP_KEY = 'ay3tmo9igb99kf5';

    var url = 'https://www.dropbox.com/1/oauth2/authorize?' +
              'response_type=token&' +
              'client_id=' + DROPBOX_APP_KEY + '&' +
              'force_reapprove=true&' +
              'redirect_uri=http://localhost';
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
    var redirectUrl = event.detail;
    var accessToken;
    var hasAccessToken = false;
    var errorMsg;
    var hasError = false;

    var parametersStr = redirectUrl.substring(redirectUrl.indexOf('#') + 1);
    var parameters = parametersStr.split('&');
    for (var i = 0; i < parameters.length; i++) {
      var parameter = parameters[i];
      var kv = parameter.split('=');
      if (kv[0] === 'access_token') {
        accessToken = kv[1];
        hasAccessToken = true;
      } else if (kv[0] === 'error_description') {
        errorMsg = kv[1];
        hasError = true;
        break;
      }
    }

    if (hasError) {
      window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
        detail: {error: errorMsg.replace(/\+/gi, ' ')}
      }));
      return;
    }

    if (!hasAccessToken) {
      console.log('still in oauth handshake...');
      return;
    }

    if (accessToken) {
      window.dispatchEvent(new CustomEvent(this.EVENT_END_OF_AUTH, {
        detail: {token: accessToken}
      }));
    } else {
      alert('Unknown error while getting Access Token!');
    }
  }
};
