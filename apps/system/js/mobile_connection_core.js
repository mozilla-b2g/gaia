/* global System, SimSettingsHelper, SIMSlotManager */
'use strict';

(function(exports) {
  // Responsible to load and init the sub system for mobile connections.
  var MobileConnectionCore = function(mobileConnections) {
    this.mobileConnections = mobileConnections;
  };
  MobileConnectionCore.IMPORTS = [
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
    'OperatorVariantManager'
  ];
  MobileConnectionCore.EVENTS = [
    'airplanemode-enabled',
    'airplanemode-disabled'
  ];
  System.create(MobileConnectionCore, {}, {
    name: 'MobileConnectionCore',
    '_handle_airplanemode-enabled': function() {
      this.radio.enabled = false;
    },
    '_handle_airplanemode-disabled': function() {
      this.radio.enabled = true;
    },
    _start: function() {
      // we have to make sure we are in DSDS
      if (SIMSlotManager.isMultiSIM()) {
        System.lazyLoad(['SimSettingsHelper'], function() {
          this.simSettingsHelper = new SimSettingsHelper(this);
          this.simSettingsHelper.start();
        }.bind(this));
      }
    },
    onSubModuleInited: function(moduleName) {
      if (moduleName == 'radio' && window.airplaneMode) {
        this.radio.enabled = !window.airplaneMode.enabled;
      }
    }
  });
  exports.MobileConnectionCore = MobileConnectionCore;
}(window));
