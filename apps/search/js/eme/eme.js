(function() {
  'use strict';

  var API_METHODS = {
    SEARCH: 'search',
    SUGGEST: 'suggest'
  };

  window.eme = {
    API: API_METHODS,
    port: null,

    openPort: function openPort() {
      if (this.port) {
        return;
      }

      var self = this;

      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('eme-api').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              self.port = port;
            });
          },
          function onConnectionRejected(reason) {
            dump('Error connecting: ' + reason + '\n');
          }
        );
      };
    }
  };

})();
