'use strict';

var Redirect = function Redirect() {

  var ORIGIN = document.location.protocol + '//' +
  document.location.host;

  var init = function init() {
    var parameters = {};

    var dataStart = document.location.href.indexOf('?');
    var params = document.location.href.substring(dataStart + 1);

    if (dataStart !== -1) {
      var elements = params.split('&');

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