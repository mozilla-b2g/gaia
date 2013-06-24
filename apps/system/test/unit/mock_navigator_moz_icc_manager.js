'use strict';

(function() {

  var props = ['cardState'];
  var eventListeners = null;

  function mnmim_init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });
    eventListeners = {'cardstatechange': []};
  }

  function mnmim_addEventListener(type, callback) {
    if (eventListeners[type]) {
      eventListeners[type][eventListeners[type].length] = callback;
    }
  }

  function mnmim_removeEventListener(type, callback) {
    if (eventListeners[type]) {
      var idx = eventListeners[type].indexOf(callback);
      eventListeners[type].splice(idx, 1);
    }
  }

  function mnmim_triggerEventListeners(type, evt) {
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
    addEventListener: mnmim_addEventListener,
    removeEventListener: mnmim_removeEventListener,
    triggerEventListeners: mnmim_triggerEventListeners,
    mTeardown: mnmim_init,
    get mEventListeners() {
      return eventListeners;
    }
  };

  mnmim_init();

  window.MockNavigatorMozIccManager = Mock;
})();
