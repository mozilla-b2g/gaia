/* global System */
'use strict';

(function(exports) {
  // Responsible to load and init the sub system for mobile connections.
  var MobileConnectionCore = function(mobileConnections) {
    this.mobileConnections = mobileConnections;
  };
  MobileConnectionCore.IMPORTS = [
    'shared/js/simslot.js',
    'shared/js/simslot_manager.js',
    'js/simcard_dialog.js',
    'js/system_simcard_dialog.js'
  ];
  MobileConnectionCore.SUB_MODULES = [
    'CallForwarding',
    'EmergencyCallbackManager',
    'EuRoamingManager',
    'SimLock',
    'OperatorVariant',
    'TelephonySettings',
    'SimSettingsHelper'
  ];
  System.create(MobileConnectionCore, {}, {
    name: 'MobileConnectionCore'
  });
  exports.MobileConnectionCore = MobileConnectionCore;
}(window));
