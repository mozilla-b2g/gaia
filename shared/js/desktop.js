/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// navigator.mozTelephony
(function(window) {
  var navigator = window.navigator;
  if ('mozTelephony' in navigator)
    return;

  var TelephonyCalls = [];
  if(RecentsDBManager){
    RecentsDBManager.prepopulateDB();
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


// If mozApps permission is denied, create a fake list of applications.
(function(window) {
  if (navigator.mozApps.mgmt.oninstall)
    return;

  try {
    navigator.mozApps.mgmt.oninstall = function() {};
    navigator.mozApps.mgmt.oninstall = null;
  } catch (e) {
    if (document.location.protocol === 'file:') {
      var paths = document.location.pathname.split('/');
      paths.pop();
      paths.pop();
      paths.pop();
      var src = 'file://' + paths.join('/') + '/webapps.js';
    } else {
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
      var src = 'http://' + domain + '/webapps.js';
    }
    document.write('<script src="' + src + '"><\/script>');
  }
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
  }

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

