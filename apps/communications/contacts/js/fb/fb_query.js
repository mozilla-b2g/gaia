'use strict';

var fb = this.fb || {};

// In an only worker execution context this would not be necessary
var self = this;
fb.utils = this.fb.utils || {};

// Runs a query against Facebook FQL. Callback is a string!!
fb.utils.runQuery = function(query, callback, access_token) {
  var queryService = 'https://graph.facebook.com/fql?q=';
  queryService += encodeURIComponent(query);

  var params = ['access_token' + '=' + access_token,
                  'format=json'];

  var queryParams = params.join('&');

  var remote = queryService + '&' + queryParams;

  var xhr = new XMLHttpRequest({
    mozSystem: true
  });

  xhr.open('GET', remote, true);
  xhr.responseType = 'json';

  xhr.timeout = fb.operationsTimeout || 30000;

  xhr.onload = function(e) {
    if (xhr.status === 200 || xhr.status === 0) {
      if (callback && typeof callback.success === 'function')
        self.setTimeout(function() {
          callback.success(xhr.response);
        },0);
    }
    else {
      self.console.error('FB: Error executing query. ', query, ' Status: ',
                           xhr.status);
      if (callback && typeof callback.error === 'function')
        self.setTimeout(callback.error, 0);
    }
  } // onload

  xhr.ontimeout = function(e) {
    self.console.error('FB: Timeout!!! while executing query', query);
    if (callback && typeof callback.timeout === 'function')
      self.setTimeout(callback.timeout, 0);
  } // ontimeout

  xhr.onerror = function(e) {
    self.console.error('FB: Error while executing query: ', query,
                             ': ', e);
    if (callback && typeof callback.error === 'function')
      self.setTimeout(function() {
        callback.error(e);
      },0);
  } // onerror

  xhr.send();
};

/**
  *  Obtains a img DOM Element with the Contact's img
  *
  */
fb.utils.getFriendPicture = function(uid, callback, access_token) {
   // Access token is necessary just in case the image is not public
   // When passing an access token to FB https must be used
  var imgSrc = 'https://graph.facebook.com/' + uid + '/picture?';

  var params = [
    'type=large',
    'access_token' + '=' + access_token
  ];

  var imgService = imgSrc + params.join('&');

  var xhr = new XMLHttpRequest({
    mozSystem: true
   });
   xhr.open('GET', imgService, true);
   xhr.responseType = 'blob';

  xhr.timeout = fb.operationsTimeout || 30000;

  xhr.onload = function(e) {
    if (xhr.status === 200 || xhr.status === 0) {
      var mblob = e.target.response;
      if (typeof callback === 'function')
        self.setTimeout(function() {
          callback(mblob);
        },0);
    }
  } // onload

  xhr.ontimeout = function(e) {
    self.console.error('FB: Timeout!!! while retrieving img for uid', uid);

    if (typeof callback === 'function')
      self.setTimeout(function() {
        callback(null);
      },0);
  } // ontimeout

  xhr.onerror = function(e) {
    self.console.error('FB: Error while retrieving the img', e);

    if (typeof callback === 'function') {
      self.setTimeout(function() {
        callback(null);
      },0);
    }
  } // onerror

  xhr.send();
};
