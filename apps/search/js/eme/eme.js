(function() {
  'use strict';

  window.eme = {
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


  /******************************* API methods *******************************/
  eme.api = {
    'search': 'search',
    'suggest': 'suggest'
  };


  /********************************* Search *********************************/


  eme.search = {
    'features' : {
      'type': 'type',
      'more': 'more',
      'rtrn': 'rtrn'
    }
  };


  /********************************* Suggest *********************************/


  eme.suggest = {
  };

})();
