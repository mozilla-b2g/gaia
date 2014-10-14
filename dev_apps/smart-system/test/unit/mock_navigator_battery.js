'use strict';

(function() {

  var props = ['level', 'charging'];

  var listeners;

  function mnb_init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });

    listeners = {};
  }

  function mnb_addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function mnb_removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  function mnb_mTriggerEvent(evt) {
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

  var Mock = {
    addEventListener: mnb_addEventListener,
    removeEventListener: mnb_removeEventListener,
    mTeardown: mnb_init,
    mTriggerEvent: mnb_mTriggerEvent
  };

  mnb_init();

  window.MockNavigatorBattery = Mock;
})();
