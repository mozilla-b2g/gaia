/* globals NotificationConnector, Promise */
'use strict';

(function(exports) {

var NotificationConnector = function() {
  window.addEventListener('notification-message', this);
  window.addEventListener('desktop-notification-resend', this);
  this.connect();
};

NotificationConnector.prototype = {
  connect: function() {
    var self = this;
    if (this._port) {
      return Promise.resolve(this._port);
    }

    return new Promise(function(resolve, reject) {
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        app.connect('notification-message').then(function onAccepted(ports) {
          if (ports.length !== 1) {
            console.error('notification service: more than one app found?');
            reject();
            return;
          }
          self._port = ports[0];
          self._port.onmessage = self.onIACMessage.bind(this);
          resolve(ports[0]);

        }, function onConnRejected(reason) {
          console.log('Warning: couldn\'t open notification service.');
          reject();
        });
      };
    });
  },

  send: function(detail) {
    if (this._port) {
      this._port.postMessage(JSON.stringify(detail));
      return;
    }
    this.connect().then(function(port) {
      port.postMessage(JSON.stringify(detail));
    });
  },

  handleEvent: function(evt) {
    switch(evt.type) {
      case 'notification-message':
        this.send(evt.detail);
        break;

      case 'desktop-notification-resend':
        this.send({
          type: 'desktop-notification-resend',
          number: evt.detail.number
        });
        break;
    }
  },

  onIACMessage: function(message) {
    var detail = JSON.parse(message.data);
    switch(detail.type) {
    case 'close-notification':
      console.error('Received close message event:' + detail.id);
      break;
    case 'click-notification':
      console.error('Received click message event' + detail.id);
      break;
    case 'added-notification':
      console.error('Received add message event' + detail.id);
      break;
    }
  }
};

exports.NotificationConnector = NotificationConnector;
})(window);

window.notificationConnector = new NotificationConnector();
