'use strict';

(function() {

  var props = {
    voice: null,
    cardState: null,
    iccInfo: null
  };

  function mnmmc_mTeardown() {
    Object.keys(props).forEach(function(prop) {
      props[prop] = null;
    });
  }

  var MockNavigatorMozMobileConnection = {
    addEventListener: function() {},
    mTeardown: mnmmc_mTeardown
  };

  Object.keys(props).forEach(function(prop) {
    props[prop] = null;

    var setFuncName = 'mNext' + prop.charAt(0).toUpperCase() + prop.substr(1);
    MockNavigatorMozMobileConnection[setFuncName] =
      mnmmc_setNext.bind(null, prop);

    Object.defineProperty(
      MockNavigatorMozMobileConnection,
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

  window.MockNavigatorMozMobileConnection = MockNavigatorMozMobileConnection;
})();
