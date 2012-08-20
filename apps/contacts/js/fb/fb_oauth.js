/*
 *  Module: Facebook integration. OAuth 2.0 basic functions
 *
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with Facebook providing a deep integration
 *  between the Open Web Device and Facebook
 *
 *
 */
var fb = window.fb || {};

fb.ACC_T = 'access_token';

if (typeof fb.oauth === 'undefined') {
  (function(document) {
    'use strict';

    var fboauth = fb.oauth = {};


    /**
     *  Initialization function it tries to find an access token
     *
     */
   function afterRedirect(state) {
      var queryString = state;

      // check if we come from a redirection
      if ((queryString.indexOf('friends') !== -1 ||
           queryString.indexOf('messages') !== -1) ||
          queryString.indexOf('logout') !== -1 ||
          queryString.indexOf('proposal') !== -1) {

        if (queryString.indexOf('friends') !== -1) {
          fboauth.getAccessToken(function(token) {
            fb.importt.getFriends(token);
          });
        }
        else if (queryString.indexOf('messages') !== -1) {
          UI.sendWallMsg();
        }
        else if (queryString.indexOf('logout') !== -1) {
          clearStorage();
          document.querySelector('#msg').textContent = 'Logged Out!';
          document.querySelector('#msg').style.display = 'block';
          window.setTimeout(
                        function() { window.location = getLocation(); },2000);
        }
        else if(queryString.indexOf('proposal') !== -1) {
          fboauth.getAccessToken(function(token) {
             fb.link.getRemoteProposal(token);
          });
        }
      }
    }


    function getLocation() {
      return (window.location.protocol + '//' + window.location.host +
              window.location.port + window.location.pathname);
    }


    fboauth.logout = function() {
      getAccessToken(function(token) { owdFbAuth.logout(token); },'');
    };


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

      if (!window.localStorage.access_token) {
          startOAuth(state);
          return;
      }
      else {
        var timeEllapsed = Date.now() - window.localStorage.token_ts;
        var expires = Number(window.localStorage.expires);

        if (timeEllapsed < expires || expires === 0) {
           ret = window.localStorage.access_token;
        }
        else {
          startOAuth(state);
          return;
        }
      }

      if (typeof ready === 'function' && typeof ret !== 'undefined') {
        ready(ret);
      }
    }

    function tokenDataReady(e) {
      var tokenData = e.data;

      // The content of window.postMessage is parsed
      var parameters = JSON.parse(tokenData);

      if (parameters.access_token) {
        var end = parameters.expires_in;
        var ret = parameters.access_token;

        window.localStorage.access_token = ret;
        window.localStorage.expires = end * 1000;
        window.localStorage.token_ts = Date.now(); 
      }

      afterRedirect(parameters.state);
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state) {
      clearStorage();

      // This page will be in charge of handling authorization
      owdFbAuth.start(state);
    }

    window.addEventListener('message', tokenDataReady, false);

  }
  )(document);
}
