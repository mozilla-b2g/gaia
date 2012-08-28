/*
 *  Module: Facebook integration
 *
 *  Product: Open Web Device
 *
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with Facebook providing a deep integration
 *  between the Open Web Device and Facebook
 *
 *
 */
if (typeof window.owdFbAuth === 'undefined') {
  (function(document) {
    'use strict';

    var owdFbAuth = window.owdFbAuth = {};

    var OAUTH_REDIRECT = 'facebook.oauth20.redirectURI';
    var FB_ENDPOINT = 'facebook.oauth20.loginPage';
    var APP_ID = 'facebook.oauth20.appid';

    // The access token
    var accessToken;
    // hash to get the token
    var hash = window.location.hash;
    // Access Token parameter
    var ACC_T = 'access_token';

    function SettingsGetter(settings) {
      var next = 0;
      var result = {};
      var msettings = settings;

      this.get = function() {
        (getSetting.bind(this))(msettings[0]);
      }

      function getSetting(setting) {
        var req = navigator.mozSettings.getLock().get(setting);
        req.onsuccess = gotSetting.bind(this);

        req.onerror = failed.bind(this);
      }

      function gotSetting(e) {
        var currentSetting = msettings[next];

        result[currentSetting] = e.target.result[currentSetting];

        next++;
        if (next < msettings.length) {
          (getSetting.bind(this))(msettings[next]);
        }
        else {
          if(typeof this.onsuccess === 'function') {
            this.onsuccess(result);
          }
        }
      }

      function failed(e) {
        if(typeof this.onerror === 'function') {
          this.onerror(e.target.error);
        }
      }
    }

    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbAuth.init = function() {
      var hash = document.location.hash.substring(1);

      if (hash.indexOf('access_token') !== -1 || hash.indexOf('state') !== -1) {
        var elements = hash.split('&');

        var parameters = {};

        elements.forEach(function(p) {
          var values = p.split('=');

          parameters[values[0]] = values[1];
        });

        window.opener.postMessage(JSON.stringify(parameters), '*');

        // Finally the window is closed
        window.close();
      }
    } // init


    owdFbAuth.start = function(state) {
      getAccessToken(state);
    }

    function getOAuthParams(cb) {
      var settings = [OAUTH_REDIRECT, FB_ENDPOINT, APP_ID];

      var getter = new SettingsGetter(settings);

      getter.onsuccess = function(result) {
        if (typeof cb === 'function') {
          cb(result);
        }
      }

      getter.onerror = function(e) {
        window.console.error('FB: Error while getting redirectURI setting',
                                                                        error);
        if (typeof cb === 'function') {
          cb({});
        }
      }

      getter.get();
    }

    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    function getAccessToken(state) {
      startOAuth(state);
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state) {
      getOAuthParams(function do_startAuth(params) {
        var queryParams = ['client_id=' + params[APP_ID], 'redirect_uri=' +
                        encodeURIComponent(params[OAUTH_REDIRECT] + '#state=' + state),
                                'response_type=token',
                                window.location.hash.substring(1),
                                'scope=' +
        encodeURIComponent([
                          'friends_about_me,friends_birthday,email,' ,
                          'friends_education_history, friends_work_history,' ,
                          'friends_status,friends_relationships,publish_stream'
                          ].join('')
      )]; // Query params

      var query = queryParams.join('&');
      var url = params[FB_ENDPOINT] + query;

      window.open(url);
    });
  }

  owdFbAuth.init();

  })(document);
}
