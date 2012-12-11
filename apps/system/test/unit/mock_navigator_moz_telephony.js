'use strict';

(function() {

  var props = ['active', 'calls'];

  var listeners;

  function mnmt_init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });

    listeners = {};
  }

  function mnmt_addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function mnmt_removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  function mnmt_mTriggerEvent(evt) {
    var evtName = evt.type;
    if (listeners[evtName]) {
      listeners[evtName].forEach(function(listener) {
        if (listener.handleEvent) {
          listener.handleEvent(evt);
        } else {
          listener.call(Mock, evt);
        }
      });
    }
  }

  var Mock= {
    addEventListener: mnmt_addEventListener,
    removeEventListener: mnmt_removeEventListener,
    mTeardown: mnmt_init,
    mTriggerEvent: mnmt_mTriggerEvent
  };

  mnmt_init();

  window.MockNavigatorMozTelephony = Mock;
})();
