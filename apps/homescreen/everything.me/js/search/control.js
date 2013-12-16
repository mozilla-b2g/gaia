(function() {
  'use strict';

  function SearchControl() {
    var _port = null;
    var connected = false;
    var pendingRender = false;

    var self = this;
    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;
      app.connect('search-results').then(
        function onConnectionAccepted(ports) {
          ports.forEach(function(port) {
            _port = port;
          });
          connected = true;
          if (pendingRender) {
            self.open();
          }
        },
        function onConnectionRejected(reason) {
          dump('Error connecting: ' + reason + '\n');
        }
      );
    };

    /**
     * Sends a message to open the rocketbar.
     */
    this.open = function openRocketbar() {
      if (!connected) {
        pendingRender = true;
        return;
      }
      _port.postMessage({action: 'render'});
    };
  }

  EverythingME.SearchControl = new SearchControl();
})();
