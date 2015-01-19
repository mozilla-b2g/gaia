/* global BaseModule */
'use strict';

(function() {
  // Responsible to load and init the sub system for mozApps.
  var IccCore = function(icc, core) {
    this.core = core;
    this.icc = icc;
  };
  IccCore.IMPORTS = [
    'shared/js/stk_helper.js',
    'js/icc_events.js',
    'js/icc_worker.js',
    'shared/js/advanced_timer.js',
    'shared/js/icc_helper.js'
  ];
  IccCore.SUB_MODULES = [
    'Icc'
  ];
  BaseModule.create(IccCore, {
    name: 'IccCore'
  });
}());
