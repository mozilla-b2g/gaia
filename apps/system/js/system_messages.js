/* global BaseModule */
'use strict';

(function() {
  // System Messages placeholder
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
      window.addEventListener('mozSystemMessage', (e) => {
        this._systemMessagesChannel.postMessage(e.detail);
        var handlers = this._handlers[e.detail.type]
        if (handlers && handlers.length) {
          handlers.forEach((handler) => {
            handler(e.detail.message);
          });
        }
      });
    }
  });
}());
