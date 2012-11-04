/*
 *  Module: Facebook integration
 *
 *  This script file contains all the logic that allows to obtain an access
 *  token through an OAuth 2.0 implicit grant flow
 *
 *
 *
 */

var fb = window.fb || {};

if (typeof fb.oauthflow === 'undefined') {
  (function(document) {
    'use strict';

    var OAuthFlow = fb.oauthflow = {};

    var OAUTH_REDIRECT = 'redirectURI';
    var FB_ENDPOINT = 'loginPage';
    var APP_ID = 'applicationId';
    var CONTACTS_APP_ORIGIN = 'contactsAppOrigin';

    // The access token
    var accessToken;
    // hash to get the token
    var hash = window.location.hash;
    // Access Token parameter
    var ACC_T = 'access_token';

    /**
     *  Initialization function it tries to find an access token
     *
     */
    OAuthFlow.init = function() {
      var hash = document.location.hash.substring(1);

      if (hash.indexOf('access_token') !== -1) {
        var elements = hash.split('&');

        var parameters = {};

        elements.forEach(function(p) {
          var values = p.split('=');

          parameters[values[0]] = values[1];
        });

        window.opener.postMessage(parameters,
                                  fb.oauthflow.params[CONTACTS_APP_ORIGIN]);

        // Finally the window is closed
        window.close();
      }
    } // init


    OAuthFlow.start = function(state) {
      getAccessToken(state);
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
      var params = fb.oauthflow.params;

      var redirect_uri = encodeURIComponent(params[OAUTH_REDIRECT] +
                                            '#state=' + state);

      var scope = ['friends_about_me,friends_birthday,email,' ,
                    'friends_education_history, friends_work_history,' ,
                    'friends_status,friends_relationships,publish_stream'
      ].join('');
      var scopeParam = encodeURIComponent(scope);

      var queryParams = ['client_id=' + params[APP_ID],
                          'redirect_uri=' + redirect_uri,
                          'response_type=token',
                          'scope=' + scopeParam,
                          'state=' + state
      ]; // Query params

    var query = queryParams.join('&');
    var url = params[FB_ENDPOINT] + query;

    window.open(url);
  }

  })(document);
}
