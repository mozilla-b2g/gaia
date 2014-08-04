/* global define */
define(function() {
  'use strict';

  // As this module is simply a function, we are not able to mock the function
  // in our tests after the module loaded. mInnerFunction provides a way that
  // allows one loads the module be able to mock the behavior of the function.
  var ctor = function mock_settings_panel() {
    if (ctor.mInnerFunction) {
      return ctor.mInnerFunction.apply(this, arguments);
    }
  };

  ctor.mTeardown = function mock_settings_panel_teardown() {
    ctor.mInnerFunction = null;
  };

  return ctor;
});
