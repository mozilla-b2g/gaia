/*
 *  Module: Facebook integration
 *
 *  This script file contains all the logic that allows to obtain an access
 *  token through an OAuth 2.0 implicit grant flow
 *
 *
 *
 */

if (typeof window.oauthflow === 'undefined') {
  (function(document) {
    'use strict';

    var OAuthFlow = window.oauthflow = {};

    var OAUTH_REDIRECT = 'redirectURI';
    var ENDPOINT = 'loginPage';
    var APP_ID = 'applicationId';
    var APP_ORIGIN = 'appOrigin';
    var SCOPE = 'scope';

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
    OAuthFlow.init = function(service) {
      var hash = document.location.hash.substring(1);
      var parameters = {};

      var dataStart = hash.indexOf('access_token');
      if (dataStart !== -1) {
        var elements = hash.split('&');

        elements.forEach(function(p) {
          var values = p.split('=');
          parameters[values[0]] = values[1];
        });

        window.opener.postMessage(parameters,
                                  oauthflow.params[service][APP_ORIGIN]);

        // Finally the window is closed
        window.close();
      }
    }; // init


    OAuthFlow.start = function(state, service) {
      getAccessToken(state, service);
    };


    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    function getAccessToken(state, service) {
      startOAuth(state, service);
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state, service) {
      var params = oauthflow.params[service];

      var redirect_uri = encodeURIComponent(params[OAUTH_REDIRECT]);

      var scope = params[SCOPE].join(',');
      var scopeParam = encodeURIComponent(scope);

      var queryParams = ['client_id=' + params[APP_ID],
                          'redirect_uri=' + redirect_uri,
                          'response_type=token',
                          'scope=' + scopeParam,
                          // Only needed for Gmail (see Bug 962377)
                          'approval_prompt=force',
                          'state=' + state
      ]; // Query params

    var query = queryParams.join('&');
    var url = params[ENDPOINT] + query;

    window.open(url);
  }

  })(document);
}
