'use strict';

var fb = window.fb || {};

fb.ACC_T = 'access_token';

if (typeof fb.oauth === 'undefined') {
  (function(document) {

    var fboauth = fb.oauth = {};

    // <callback> is invoked when an access token is ready
    // and the hash state matches <state>
    var accessTokenCbData;

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage() {
      window.asyncStorage.removeItem('access_token');
      window.asyncStorage.removeItem('expires');
      window.asyncStorage.removeItem('token_ts');
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

      asyncStorage.getItem('access_token',
                           function getAccessToken(access_token) {
        if (!access_token) {
          startOAuth(state);
          return;
        }

        asyncStorage.getItem('token_ts', function getTokenTs(token_ts) {
          asyncStorage.getItem('expires', function getExpires(expires) {
            expires = Number(expires);
            if (expires !== 0 && Date.now() - token_ts >= expires) {
              startOAuth(state);
              return;
            }

            if (typeof ready === 'function') {
              ready(access_token);
            }
          });
        });
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
      var tokenData = e.data;

      // The content of window.postMessage is parsed
      var parameters = JSON.parse(tokenData);

      if (parameters.access_token) {
        var end = parameters.expires_in;
        var access_token = parameters.access_token;

        // Don't wait for callback because it's not necessary
        window.asyncStorage.setItem('access_token', access_token);
        window.asyncStorage.setItem('expires', end * 1000);
        window.asyncStorage.setItem('token_ts', Date.now());
      }

      if (parameters.state === accessTokenCbData.state) {
        accessTokenCbData.callback(access_token);
      } else {
        window.console.error('FB: Error in state', parameters.state,
                                  accessTokenCbData.state);
      }
    }

    window.addEventListener('message', tokenDataReady);

  }
  )(document);
}
