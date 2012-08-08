/*
 *  Module: Facebook integration
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
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

      // The access token
      var accessToken;
      // Application Id
      var appID = '323630664378726';
      // hash to get the token
      var hash = window.location.hash;
      // Access Token parameter
      var ACC_T = 'access_token';

      // Oauth dialog URI
      // var oauthDialogUri = 'https://m.facebook.com/dialog/oauth?';
      var oauthDialogUri = 'https://m.facebook.com/dialog/oauth/?';

    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbAuth.init = function() {
      var hash = document.location.hash.substring(1);

      if(hash.indexOf('access_token') !== -1 || hash.indexOf('state') !== -1) {
        window.console.log('Access Token Ready!!!');

        var elements = hash.split('&');

        window.console.log(elements);

        var parameters = {};

        elements.forEach(function(p) {
          var values = p.split('=');

          parameters[values[0]] = values[1];
        });

        window.console.log('Hash Parameters', parameters);

        window.opener.postMessage(JSON.stringify(parameters),'*');

        // Finally the window is closed
        window.close();
      }
    } // init


    owdFbAuth.start = function(state) {
      getAccessToken(state);
    }

    function getLocation() {
      return 'http://' + 'intense-tundra-4122.herokuapp.com/fbowd' +
                              '/fbint-auth.html';
    }

     /**
     *  Performs Facebook logout
     *
     *
     */
    owdFbAuth.logout = function(accessToken) {
      window.console.log('Logout');

      window.open('https://www.facebook.com/logout.php?next=' +
                  encodeURIComponent(getLocation() + '#state=logout') +
                  '&access_token=' + accessToken);
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
      var queryParams = ['client_id=' + appID,
                                'redirect_uri=' +
                        encodeURIComponent(getLocation() + '#state=' + state),
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
      var url = oauthDialogUri + query;

      window.console.log('URL: ', url);

      window.open(url);
    }

    window.console.log('OWD FB!!!!');

    owdFbAuth.init();
  }
  )(document);
}
