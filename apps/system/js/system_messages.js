/* global BaseModule, BroadcastChannel, Service */
'use strict';

(function() {
  var BASE_URL = 'chrome://gaia/content';
  var MESSAGES = {
    'bluetooth-dialer-command': '/dialer/index.html#keyboard-view',
    'headset-button': '/dialer/index.html#keyboard-view',
    'notification': '/dialer/index.html#keyboard-view',
    'telephony-new-call': '/dialer/index.html#keyboard-view',
    'telephony-call-ended': '/dialer/index.html#keyboard-view',
    'ussd-received': '/dialer/index.html#keyboard-view'
  };

  var SystemMessages = function(core) {
  };

  BaseModule.create(SystemMessages, {
    name: 'SystemMessages',
    DEBUG: false,
    _handlers: {},
    _systemMessagesChannel: new BroadcastChannel('systemMessages'),
    _mozSetMessageHandler: function(type, handler) {
      this._handlers[type] = this._handlers[type] || [];
      this._handlers[type].push(handler);
    },
    _start: function() {
      navigator.mozSetMessageHandler = this._mozSetMessageHandler.bind(this);
      window.addEventListener('mozSystemMessage', this._onMessage.bind(this));
    },

    _onMessage: function(e) {
      // Calling registered handlers in the system
      var handlers = this._handlers[e.detail.type];
      if (handlers && handlers.length) {
        handlers.forEach((handler) => {
          handler(e.detail.message);
        });
      }

      // Wake up the app, if we were waiting a system message
      // for it.
      if (MESSAGES[e.detail.type]) {
        var url = BASE_URL + MESSAGES[e.detail.type];
        if (!Service.query('AppWindowManager.getApp', url)) {
          this._openUrlAndPost(url, e.detail);
          return;
        }
      }

      this._systemMessagesChannel.postMessage(e.detail);
    },

    _openUrlAndPost: function(url, detail) {
      var messagesChannel = this._systemMessagesChannel;
      var changeAppEvent = 'appwindowmanager-activated';
      window.addEventListener(changeAppEvent, function onOpen(evt) {
        var activeApp = Service.query('AppWindowManager.getActiveApp');
        if (activeApp.url === url) {
          window.removeEventListener(changeAppEvent, onOpen);
          var frame = activeApp.element;
          frame.addEventListener('mozbrowserloadend', function onAppOpen() {
            frame.removeEventListener('mozbrowserloadend', onAppOpen);
            messagesChannel.postMessage(detail);
          });
        }
      });

      window.dispatchEvent(new CustomEvent('webapps-launch', {
        detail: {url: url}
      }));
    }
  });
}());
