'use strict';

var Redirect = function Redirect() {

  var ORIGIN = document.location.protocol + '//' +
  document.location.host;

  var init = function init() {
    var hash = document.location.hash.substring(1);
    var parameters = {};

    var dataStart = hash.indexOf('access_token');

    if (dataStart !== -1) {
      var elements = hash.split('&');

      elements.forEach(function(p) {
        var values = p.split('=');
        parameters[values[0]] = values[1];
      });
      console.log('-----> Post message:');
      console.log(JSON.stringify(parameters));

      window.opener.postMessage(parameters, ORIGIN);
      window.close();
    }

  };

  return {
    'init': init
  };

}();

Redirect.init();