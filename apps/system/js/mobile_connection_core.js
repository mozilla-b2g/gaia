/* global BaseModule, SimSettingsHelper, SIMSlotManager */
'use strict';

(function() {
  // Responsible to load and init the sub system for mobile connections.
  var MobileConnectionCore = function(mobileConnections) {
    this.mobileConnections = mobileConnections;
  };
  //MobileConnectionCore.IMPORTS = [
  //  'shared/js/simslot.js',
  //  'shared/js/simslot_manager.js'
  //];
  MobileConnectionCore.SUB_MODULES = [
    'Radio',
    'CallForwarding',
    'EmergencyCallbackManager',
    'EuRoamingManager'
  //  'SimLockManager',
  //  'TelephonySettings',
  //  'OperatorVariantManager'
  ];
  MobileConnectionCore.EVENTS = [
    'airplanemode-enabled',
    'airplanemode-disabled'
  ];
  MobileConnectionCore.SERVICES = [
    'isMultiSIM'
  ];
  BaseModule.create(MobileConnectionCore, {
    name: 'MobileConnectionCore',
    '_handle_airplanemode-enabled': function() {
      if (this.radio) {
        this.radio.enabled = false;
      }
    },
    '_handle_airplanemode-disabled': function() {
      if (this.radio) {
        this.radio.enabled = true;
      }
    },
    _start: function() {
      // we have to make sure we are in DSDS
      if (SIMSlotManager.isMultiSIM()) {
        BaseModule.lazyLoad(['SimSettingsHelper'], function() {
          this.simSettingsHelper = new SimSettingsHelper(this);
          this.simSettingsHelper.start();
        }.bind(this));
      }
    },
    _radio_loaded: function(moduleName) {
      this.radio.start();
      if (window.airplaneMode) {
        this.radio.enabled = !window.airplaneMode.enabled;
      }
    },

    /**
     * SIMSlotManager is not based on the base module,
     * so we need to provide the interface here to protect it.
     * @return {Boolean} There is multiple SIM slots in the device or not.
     */
    isMultiSIM: function() {
      this.debug('querying multiple sim..');
      if (window.SIMSlotManager) {
        return window.SIMSlotManager.isMultiSIM();
      } else {
        if (this.mobileConnections) {
          return (this.mobileConnections.length > 1);
        } else {
          return false;
        }
      }
    }
  });
}());
