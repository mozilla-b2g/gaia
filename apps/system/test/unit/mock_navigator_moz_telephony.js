'use strict';

(function() {

  var props = {
    active: null,
    calls: null
  };

  var listeners = {};

  function mnmmc_mTeardown() {
    Object.keys(props).forEach(function(prop) {
      props[prop] = null;
    });

    listeners = {};
  }

  function mnmmc_addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function mnmmc_removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  function mnmmc_mTriggerEvent(evt) {
    var evtName = evt.type;
    if (listeners[evtName]) {
      listeners[evtName].forEach(function(listener) {
        if (listener.handleEvent) {
          listener.handleEvent(evt);
        } else {
          listener.call(MockNavigatorMozTelephony, evt);
        }
      });
    }
  }

  var MockNavigatorMozTelephony = {
    addEventListener: mnmmc_addEventListener,
    removeEventListener: mnmmc_removeEventListener,
    mTeardown: mnmmc_mTeardown,
    mTriggerEvent: mnmmc_mTriggerEvent
  };

  Object.keys(props).forEach(function(prop) {
    props[prop] = null;

    var setFuncName = 'mNext' + prop.charAt(0).toUpperCase() + prop.substr(1);
    MockNavigatorMozTelephony[setFuncName] =
      mnmmc_setNext.bind(null, prop);

    Object.defineProperty(
      MockNavigatorMozTelephony,
      prop,
      {
        get: mnmmc_getProp.bind(null, prop)
      });
  });

  function mnmmc_setNext(prop, value) {
    props[prop] = value;
  }

  function mnmmc_getProp(prop) {
    return props[prop];
  }

  window.MockNavigatorMozTelephony = MockNavigatorMozTelephony;
})();
