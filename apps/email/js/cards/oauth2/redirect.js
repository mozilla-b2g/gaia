'use strict';

(function() {
  var origin = document.location.protocol + '//' + document.location.host;
  var search = document.location.search.substring(1);
  var parameters = {
    messageType: 'oauthRedirect'
  };

  var elements = search.split('&');
  elements.forEach(function(p) {
    var values = p.split('=');
    parameters[decodeURIComponent(values[0])] = decodeURIComponent(values[1]);
  });

  window.opener.postMessage(parameters, origin);
  window.close();
}());
