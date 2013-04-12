var Redirect = function Redirect() {

  var init = function init() {
    var hash = document.location.hash.substring(1);
    var parameters = {};

    var dataStart = hash.indexOf('access_token');

    var dataStart = hash.indexOf('access_token');
    if (dataStart !== -1) {
      var elements = hash.split('&');

      elements.forEach(function(p) {
        var values = p.split('=');
        parameters[values[0]] = values[1];
      });

      window.opener.postMessage(parameters, '*');
      window.close();
    }

  };

  return {
    'init': init
  };

}();

Redirect.init();