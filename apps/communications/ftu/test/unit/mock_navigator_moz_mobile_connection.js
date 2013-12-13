'use strict';

(function() {

  var props = ['voice', 'data', 'retryCount', 'iccId'];
  var listeners;

  function _init() {
    props.forEach(function(prop) {
      Mock[prop] = null;
    });
    listeners = {};
  }

  function _setProperty(property, newState) {
    Mock[property] = newState;
  }

  function _addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function _removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  var Mock = {
    mTeardown: _init,
    setProperty: _setProperty,
    addEventListener: _addEventListener,
    removeEventListener: _removeEventListener
  };

  _init();

  window.MockNavigatorMozMobileConnection = Mock;
})();
