'use strict';

var fb = window.fb || {};

fb.ACC_T = 'access_token';

if (typeof fb.oauth === 'undefined') {
  (function(document) {

    var fboauth = fb.oauth = {};

    // <callback> is invoked when an access token is ready
    // and the hash state matches <state>
    var accessTokenCbData;

    var STORAGE_KEY = 'tokenData';

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage() {
      window.asyncStorage.removeItem(STORAGE_KEY);
    }


    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    fboauth.getAccessToken = function(ready, state) {
      accessTokenCbData = {
        callback: ready,
        state: state
      };

      // Enables simple access to test tokens for hacking up the app
      // This code will need to be deleted once we have a final product
      fb.testToken = fb.testToken || parent.fb.testToken;
      if (typeof fb.testToken === 'string' && fb.testToken.trim().length > 0) {
        window.console.warn('Facebook. A test token will be used!');
        tokenDataReady({
          data: {
            access_token: fb.testToken,
            expires_in: 0,
            state: state
          }
        });
        return;
      }

      asyncStorage.getItem(STORAGE_KEY,
                           function getAccessToken(tokenData) {
        if (!tokenData || !tokenData.access_token) {
          startOAuth(state);
          return;
        }

        var access_token = tokenData.access_token;
        var expires = Number(tokenData.expires);
        var token_ts = tokenData.token_ts;

        if (expires !== 0 && Date.now() - token_ts >= expires) {
          startOAuth(state);
          return;
        }

        if (typeof ready === 'function') {
          ready(access_token);
        }
      });
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state) {
      clearStorage();

      // This page will be in charge of handling authorization
      fb.oauthflow.start(state);
    }

    function tokenDataReady(e) {
      var parameters = e.data;
      if (!parameters || !parameters.access_token) {
        return;
      }

      Curtain.show('wait', accessTokenCbData.state);

      window.setTimeout(function do_token_ready() {
        var access_token = parameters.access_token;
        if (parameters.state === accessTokenCbData.state) {
          accessTokenCbData.callback(access_token);
        } else {
          window.console.error('FB: Error in state', parameters.state,
                                    accessTokenCbData.state);
          return;
        }

        var end = parameters.expires_in;

        // Don't wait for callback because it's not necessary
        window.asyncStorage.setItem(STORAGE_KEY, {
          access_token: access_token,
          expires: end * 1000,
          token_ts: Date.now()
        });
      },0);
    } // tokenReady

    window.addEventListener('message', tokenDataReady);

  }
  )(document);
}
