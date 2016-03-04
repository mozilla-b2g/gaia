/* global BaseModule */
'use strict';

(function(exports) {
  // Responsible to load and init the sub system for mozApps.
  var AppCore = function(core) {
    this.core = core;
  };

  AppCore.SUB_MODULES = [
    'SystemWindow',
    'AudioChannelService',
    'AppWindowManager'
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    DEBUG: false
  });
}(window));
