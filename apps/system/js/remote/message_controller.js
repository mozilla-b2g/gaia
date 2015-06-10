/* global BaseModule, BroadcastChannel, Service */
'use strict';

(function(exports) {
  function MessageController() {
  }

  // An empty EVENTS is necessary for triggering EventMixin in BaseModule.
  MessageController.EVENTS = [
  ];

  BaseModule.create(MessageController, {
    DEBUG: false,

    name: 'MessageController',

    postMessage: function(type, detail) {
      this.debug('[#' + this.displayId + '] ' +
        'broadcast message to local system: ' + type +
        ', ' + JSON.stringify(detail));

      this.broadcastChannel.postMessage({
        source: this.displayId,
        type: type,
        detail: detail
      });
    },

    _start: function() {
      this.displayId = Service.query('displayId');

      this.broadcastChannel = new BroadcastChannel('multiscreen');
      this.broadcastChannel.addEventListener('message', this);
    },

    _stop: function() {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    },

    _handle_message: function(evt) {
      var data = evt.data;
      if (data.target !== this.displayId) {
        return;
      }
      this.debug('[#' + this.displayId + '] ' +
        'got message from local system: ' + data.type +
        ', ' + JSON.stringify(data.detail));

      switch(data.type) {
        case 'launch-app':
          Service.request('launchApp', data.detail).then(() => {
            this.postMessage('launch-app-success', {
              config: data.detail
            });
          }).catch((reason) => {
            this.postMessage('launch-app-error', {
              config: data.detail,
              reason: reason
            });
          });
          break;
      }
    }
  });
}(window));
