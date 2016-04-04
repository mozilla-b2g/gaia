/* global BaseModule */
'use strict';

(function(exports) {
  /**
   * This module is used to load custom modules depending on the device type.
   * We can find that config in build/{TYPE}/custom_modules.json
   */
  var CustomModules = function() {
  };

  CustomModules.SUB_MODULES = [];

  BaseModule.create(CustomModules, {
    DEBUG: false,
    name: 'CustomModules'
  });
}(window));
