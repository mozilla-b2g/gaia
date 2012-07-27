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
if(typeof window.owdFbAuth === 'undefined') {
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
      var oauthDialogUri = 'http://m.facebook.com/dialog/oauth/?';

    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbAuth.init = function() {
      window.console.log("The hash is: ", hash);
      window.console.log('document.location.search: ',document.location.search);

      this.start();
    }


    owdFbAuth.start = function() {
      getAccessToken();
    }

    function getLocation() {
      return (window.location.protocol + "//" + window.location.host +
                window.location.port + '/fbint.html');
    }


    /**
     *  Performs Facebook logout
     *
     *
     */
    function logout() {
      window.console.log('Logout');
      clearStorage();

      document.location =
              'https://m.facebook.com/logout.php?next=' +
                  encodeURIComponent(getLocation() + "?logout=1")
                  + '&access_token=' + accessToken;
    }

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage() {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('expires');
      window.localStorage.removeItem('ts_expires');
    }



    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    function getAccessToken() {
      startOAuth();
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth() {
      clearStorage();

      var queryParams = ['client_id=' + appID,
                                'redirect_uri='
                                    + encodeURIComponent(getLocation()),
                                'response_type=token',
                                window.location.hash.substring(1),
                                'scope=' +
      encodeURIComponent('friends_about_me,friends_birthday,email,\
friends_education_history, friends_work_history,friends_status,\
friends_relationships,publish_stream')];
      var query = queryParams.join('&');
      var url = oauthDialogUri + query;

      window.console.log('URL: ', url);

      document.location = url;
    }

    window.console.log('OWD FB!!!!');

    // Everything is initialized
    owdFbAuth.init();
  }
  )(document);
}
