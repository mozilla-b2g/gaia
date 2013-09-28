'use strict';

// XXX: After Dominic lands shared/js/media/remote_controls.js, we should switch
// to using that for our IAC code, since that's way closer to reality.

var FakeMusicComms = {
  _ports: null,
  _queuedMessages: [],

  init: function() {
    this._sendMessage('appinfo', {
      origin: window.location.origin,
      icon: window.location.origin + '/style/icons/Music.png'
    });

    var self = this;
    navigator.mozApps.getSelf().onsuccess = function() {
      var app = this.result;

      app.connect('mediacomms').then(function(ports) {
        self._ports = ports;
        self._queuedMessages.forEach(function(message) {
          self._ports.forEach(function(port) {
            port.postMessage(message);
          });
        });
        self._queuedMessages = null;
      });
    };

    window.addEventListener('unload', function() {
      self._sendMessage('unload');
    });
  },

  _sendMessage: function(name, value) {
    var message = {type: name, data: value};
    if (!this._ports) {
      this._queuedMessages.push(message);
    } else {
      this._ports.forEach(function(port) {
        port.postMessage(message);
      });
    }
  },

  notifyTrackChanged: function(metadata) {
    this._sendMessage('nowplaying', metadata);
  },

  notifyStatusChanged: function(mode) {
    this._sendMessage('status', mode);
  }
};

FakeMusicComms.init();
