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
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('expires');
      window.localStorage.removeItem('token_ts');
    }


    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    fboauth.getAccessToken = function(ready, state) {
      var ret;

      accessTokenCbData = {
        callback: ready,
        state: state
      };

      if (!window.localStorage.access_token) {
          startOAuth(state);
          return;
      } else {
        var timeEllapsed = Date.now() - window.localStorage.token_ts;
        var expires = Number(window.localStorage.expires);

        if (timeEllapsed < expires || expires === 0) {
           ret = window.localStorage.access_token;
        } else {
          startOAuth(state);
          return;
        }
      }

      if (typeof ready === 'function' && typeof ret !== 'undefined') {
        ready(ret);
      }
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

        window.localStorage.access_token = access_token;
        window.localStorage.expires = end * 1000;
        window.localStorage.token_ts = Date.now();
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
