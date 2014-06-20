'use strict';

/* global NativeInfo */

(function(exports) {

  function Synchronizer() {
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
      NativeInfo.processApp('install', message.id);
    },

    /**
     * It deletes an app from collections.
     */
    uninstall: function(event) {
      var message = event.data;
      NativeInfo.processApp('uninstall', message.id);
    }
  };

  exports.synchronizer = new Synchronizer();
}(window));
