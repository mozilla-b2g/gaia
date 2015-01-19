/* global BaseModule, SimSettingsHelper, SIMSlotManager */
'use strict';

(function() {
  // Responsible to load and init the sub system for mobile connections.
  var MobileConnectionCore = function(mobileConnections, core) {
    this.core = core;
    this.mobileConnections = mobileConnections;
  };
  MobileConnectionCore.IMPORTS = [
    'shared/js/icc_helper.js',
    'shared/js/simslot.js',
    'shared/js/simslot_manager.js'
  ];
  MobileConnectionCore.SUB_MODULES = [
    'Radio',
    'CallForwarding',
    'EmergencyCallbackManager',
    'EuRoamingManager',
    'SimLockManager',
    'TelephonySettings',
    'OperatorVariantManager',
    'CostControl',
    'InternetSharing',
    'IccCore' // Because it's bind to mobileConnection
  ];

  BaseModule.create(MobileConnectionCore, {
    name: 'MobileConnectionCore',

    _start: function() {
      // we have to make sure we are in DSDS
      if (SIMSlotManager.isMultiSIM()) {
        BaseModule.lazyLoad(['SimSettingsHelper']).then(function() {
          this.debug('lazily load SimSettingsHelper');
          this.simSettingsHelper = SimSettingsHelper;
          this.simSettingsHelper.start();
        }.bind(this));
      }
    }
  });
}());
