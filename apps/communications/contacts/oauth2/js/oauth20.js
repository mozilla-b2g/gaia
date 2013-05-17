'use strict';

var fb = window.fb || {};

if (typeof window.oauth2 === 'undefined') {
  (function(document) {
    var oauth2 = window.oauth2 = {};
    // <callback> is invoked when an access token is ready
    // and the hash state matches <state>
    var accessTokenCbData;

    var STORAGE_KEY = 'tokenData';

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage(service) {
      window.asyncStorage.removeItem(getKey(service));
    }

    function getKey(service) {
      var key = STORAGE_KEY;
      if (service !== 'facebook') {
        key = STORAGE_KEY + '_' + service;
      }

      return key;
    }


    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    oauth2.getAccessToken = function(ready, state, service) {
      accessTokenCbData = {
        callback: ready,
        state: state,
        service: service
      };

      // Enables simple access to test tokens for hacking up the app
      // This code will need to be deleted once we have a final product
      fb.testToken = fb.testToken || parent.fb.testToken;
      if (service === 'facebook' && typeof fb.testToken === 'string' &&
          fb.testToken.trim().length > 0) {
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

      asyncStorage.getItem(getKey(service),
                           function getAccessToken(tokenData) {
        if (!tokenData || !tokenData.access_token) {
          startOAuth(state, service);
          return;
        }

        var access_token = tokenData.access_token;
        var expires = Number(tokenData.expires);
        var token_ts = tokenData.token_ts;

        if (expires !== 0 && Date.now() - token_ts >= expires) {
          window.console.warn('Access token has expired, restarting flow');
          startOAuth(state, service);
          return;
        }

        if (typeof ready === 'function') {
          ready(access_token);
        }
      });
    };

    function getLocation(href) {
      var l = document.createElement('a');
      l.href = href;
      return l;
    };

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state, service) {
      clearStorage(service);

      // This page will be in charge of handling authorization
      oauthflow.start(state, service);
    }

    function tokenDataReady(e) {
      var parameters = e.data;
      if (!parameters || !parameters.access_token) {
        return;
      }
      var location = getLocation(oauthflow.params[accessTokenCbData.service].
        redirectURI);
      var allowedOrigin = oauthflow.params[accessTokenCbData.service].appOrigin;
      if (e.origin !== allowedOrigin) {
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

        window.asyncStorage.setItem(getKey(accessTokenCbData.service), {
          access_token: access_token,
          expires: end * 1000,
          token_ts: Date.now()
        }, function notify_parent() {
              parent.postMessage({
                type: 'token_stored',
                data: ''
              }, oauthflow.params[accessTokenCbData.service].appOrigin);
        });
      },0);
    } // tokenReady

    window.addEventListener('message', tokenDataReady);

  }
  )(document);
}
