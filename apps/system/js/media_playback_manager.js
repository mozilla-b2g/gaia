/**
 * Because the MediaPlaybackWidget needs to know whether the
 * corresponding player app got initialized or terminated,
 * we need a manager in the System app.
 */
(function(exports) {
  'use strict';
  var MediaPlaybackManager = function() {
    this.configs = {
      commname: 'mediacomms',
      events: [
        'iac-mediacomms',
        'appterminated'
      ]
    };
    this.states = {
      queuedMessages: [],
      apporigin: ''
    };

    // For firing IAC message.
    this.app = null;
  };

  MediaPlaybackManager.prototype.handleEvent =
  function mpm_handleEvent(evt) {
    switch(evt.type) {
      case 'iac-' + this.configs.commname:
        var message = evt.detail;
        if ('appinfo' === message.type) {
          this.states.apporigin = message.data.origin;
        }
        break;
      case 'appterminated':
        if (this.states.apporigin === evt.detail.origin) {
          this.postMessage('appterminated');
        }
        break;
    }
  };

  MediaPlaybackManager.prototype.start =
  function mpm_start() {
    this.configs.events.forEach((ename) => {
      window.addEventListener(ename, this);
    });

    // Get app instance and post all queued messages.
    navigator.mozApps.getSelf().onsuccess = (evt) => {
      this.app = evt.target.result;
      this.states.queuedMessages.forEach((message) => {
        this.app.connect(this.configs.commname).then((ports) => {
          ports.forEach((port) => {
            port.postMessage(message);
          });
        });
      });
      this.states.queuedMessages.length = 0;
    };
    return this;
  };

  MediaPlaybackManager.prototype.stop =
  function mpm_stop() {
    this.configs.events.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
    return this;
  };

  MediaPlaybackManager.prototype.postMessage =
  function mpm_postMessage(type, detail) {
    if (!this.app) {
      this.queueMessage(type, detail);
      navigator.mozApps.getSelf().onsuccess = (evt) => {
        this.app = evt.target.result;
        this.states.queuedMessages.forEach((message) => {
          this.app.connect(this.configs.commname).then((ports) => {
            ports.forEach((port) => {
              port.postMessage(message);
            });
          });
        });
        this.states.queuedMessages.length = 0;
      };
    } else {
      this.app.connect(this.configs.commname).then((ports) => {
        ports.forEach((port) => {
          port.postMessage( { 'type': type, 'data': detail } );
        });
      });
    }
  };

  MediaPlaybackManager.prototype.queueMessage =
  function mpm_queueMessage(type, detail) {
    this.states.queuedMessage.push({
      'type': type,
      'data': detail
    });
  };

  exports.MediaPlaybackManager = MediaPlaybackManager;
})(window);

