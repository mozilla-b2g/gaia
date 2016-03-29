/* global BaseModule */
'use strict';

(function() {
  // System Messages placeholder
  var SystemMessages = function(core) {
  };

  BaseModule.create(SystemMessages, {
    name: 'SystemMessages',
    DEBUG: false,
    _mozSetMessageHandler: function(type, handler) {

    },
    _start: function() {
      navigator.mozSetMessageHandler = this._mozSetMessageHandler;
    }
  });
}());
