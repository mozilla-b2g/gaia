'use strict';
/* global eme */
/* global CollectionIcon */
/* global NativeInfo */

(function(exports) {

  function Synchronizer() {

    // Icon generation requirements.
    var grid = document.getElementById('grid');
    CollectionIcon.init(grid.maxIconSize);

    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
  }

  Synchronizer.prototype = {
    onConnection: function(connectionRequest) {
      var action = connectionRequest.keyword;
      if (action !== 'install' && action !== 'uninstall') {
        return;
      }

      var port = this.port = connectionRequest.port;
      port.onmessage = this[action].bind(this);
      port.start();
    },

    /**
     * It populates collections with the installed app.
     */
    install: function(event) {
      var message = event.data;
      eme.init().then(() => NativeInfo.processApp('install', message.id));
    },

    /**
     * It deletes an app from collections.
     */
    uninstall: function(event) {
      var message = event.data;
      eme.init().then(() => NativeInfo.processApp('uninstall', message.id));
    }
  };

  exports.synchronizer = new Synchronizer();
}(window));
