/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library should help debugging Gaia on a desktop browser, where APIs like
 * mozTelephony or mozApps are not supported.
 */

// navigator.mozTelephony
(function(window) {
  var navigator = window.navigator;
  if ('mozTelephony' in navigator)
    return;

  var TelephonyCalls = [];
  if (typeof(RecentsDBManager) != 'undefined' && RecentsDBManager) {
    RecentsDBManager.init(function() {
      RecentsDBManager.prepopulateDB(function() {
        RecentsDBManager.close();
      });
    });
  }
  navigator.mozTelephony = {
    dial: function(number) {
      var TelephonyCall = {
        number: number,
        state: 'dialing',
        addEventListener: function() {},
        hangUp: function() {},
        removeEventListener: function() {}
      };

      TelephonyCalls.push(TelephonyCall);

      return TelephonyCall;
    },
    addEventListener: function(name, handler) {
    },
    get calls() {
      return TelephonyCalls;
    },
    muted: false,
    speakerEnabled: false,

    // Stubs
    onincoming: null,
    oncallschanged: null
  };
})(this);

// Emulate device buttons. This is groteskly unsafe and should be removed soon.
(function(window) {
  var supportedEvents = { keydown: true, keyup: true };
  var listeners = [];

  var originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, capture) {
    if (this === window && supportedEvents[type]) {
      listeners.push({ type: type, listener: listener, capture: capture });
    }
    originalAddEventListener.call(this, type, listener, capture);
  };

  var originalRemoveEventListener = window.removeEventListener;
  window.removeEventListener = function(type, listener) {
    if (this === window && supportedEvents[type]) {
      var newListeners = [];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type && listeners[n].listener == listener)
          continue;
        newListeners.push(listeners[n]);
      }
      listeners = newListeners;
    }
    originalRemoveEventListener.call(this, type, listener);
  };

  var KeyEventProto = {
    DOM_VK_HOME: 36
  };

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (typeof data === 'string' && data.indexOf('moz-key-') == 0) {
      var type, key;
      if (data.indexOf('moz-key-down-') == 0) {
        type = 'keydown';
        key = data.substr(13);
      } else if (data.indexOf('moz-key-up-') == 0) {
        type = 'keyup';
        key = data.substr(11);
      } else {
        return;
      }
      key = KeyEvent[key];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type) {
          var fn = listeners[n].listener;
          var e = Object.create(KeyEventProto);
          e.type = type;
          e.keyCode = key;
          if (typeof fn === 'function')
            fn(e);
          else if (typeof fn === 'object' && fn.handleEvent)
            fn.handleEvent(e);
          if (listeners[n].capture)
            return;
        }
      }
    }
  });
})(this);

