(function() {
  'use strict';

  window.eme = {
    api: null,
    homescreenPort: null,

    // open an inter-app port with the homescreen/e.me instance
    // then init search/e.me instance
    // (we want the two instances to share basic information like apiKey)
    init: function init() {
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        app.connect('eme-api').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              eme.homescreenPort = port;
              eme.homescreenPort.postMessage({'action': 'init'});
            });
          },
          function onConnectionRejected(reason) {
            dump('Error connecting: ' + reason + '\n');
          }
        );
      };

      this.init = function noop() {
        // avoid multiple init calls
      };
    },

    onmessage: function onmessage(msg) {
      var data = msg.data;
      var action = data.action;

      switch (action) {
        case 'init':
          eme.api.init({
            'apiKey': data.apiKey
          });
          break;
      }
    }

  };

})();
