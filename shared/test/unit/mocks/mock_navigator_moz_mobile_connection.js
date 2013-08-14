'use strict';

(function() {

  var props = ['voice', 'data'];
  var eventListeners = null;

  function mnmmc_init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });
    eventListeners = { 'iccinfochange': [] };
  }

  function mnmmc_addEventListener(type, callback) {
    if (eventListeners[type]) {
      eventListeners[type][eventListeners[type].length] = callback;
    }
  }

  function mnmmc_removeEventListener(type, callback) {
    if (eventListeners[type]) {
      var idx = eventListeners[type].indexOf(callback);
      eventListeners[type].splice(idx, 1);
    }
  }

  function mnmmc_triggerEventListeners(type, evt) {
    if (!eventListeners[type]) {
      return;
    }
    eventListeners[type].forEach(function(callback) {
      if (typeof callback === 'function') {
        callback(evt);
      } else if (typeof callback == 'object' &&
                 typeof callback['handleEvent'] === 'function') {
        callback['handleEvent'](evt);
      }
    });

    if (typeof Mock['on' + type] === 'function') {
      Mock['on' + type](evt);
    }
  }

  var Mock = {
    addEventListener: mnmmc_addEventListener,
    removeEventListener: mnmmc_removeEventListener,
    triggerEventListeners: mnmmc_triggerEventListeners,
    mTeardown: mnmmc_init,
    get mEventListeners() {
      return eventListeners;
    }
  };

  mnmmc_init();

  window.MockNavigatorMozMobileConnection = Mock;
})();
