/* global define */
define(function() {
  'use strict';

  var _mInnerFunction = null;
  var ctor = function mock_settings_panel() {
    if (_mInnerFunction) {
      return _mInnerFunction.apply(this, arguments);
    }
  };

  // As this module is simply a function, we are not able to mock the function
  // in our tests after the module loaded. mInnerFunction provides a way that
  // allows one loads the module be able to mock the behavior of the function.
  Object.defineProperty(ctor, 'mInnerFunction', {
    configurable: true,
    get: function() {
      return _mInnerFunction;
    },
    set: function(value) {
      _mInnerFunction = value;
    }
  });

  ctor.mTeardown = function mock_settings_panel_teardown() {
    ctor._mInnerFunction = null;
  };

  return ctor;
});
