/* global LockScreenBasicComponent, LockScreenConnectionStatesWidgetSetup */
'use strict';

/**
 * The ConnectionStates widget on LockScreen.
 * ConnectionStates widget states:
 * ConnectionStatesSetup
 **/
(function(exports) {
  var LockScreenConnectionStatesWidget = function() {
    LockScreenBasicComponent.apply(this);
    // View would be: lockscreen-conn-states
    this.resources.elements.SIMID = 'span:nth-of-type(1)';
    this.resources.elements.pimary = 'span:nth-of-type(2)';
    this.resources.elements.secondary = 'span:last';
    this.properties.messageMap = {
      'unknown': 'emergencyCallsOnly-unknownSIMState',
      'pinRequired': 'emergencyCallsOnly-pinRequired',
      'pukRequired': 'emergencyCallsOnly-pukRequired',
      'networkLocked': 'emergencyCallsOnly-networkLocked',
      'serviceProviderLocked': 'emergencyCallsOnly-serviceProviderLocked',
      'corporateLocked': 'emergencyCallsOnly-corporateLocked',
      'network1Locked': 'emergencyCallsOnly-network1Locked',
      'network2Locked': 'emergencyCallsOnly-network2Locked',
      'hrpdNetworkLocked' : 'emergencyCallsOnly-hrpdNetworkLocked',
      'ruimCorporateLocked' : 'emergencyCallsOnly-ruimCorporateLocked',
      'ruimServiceProviderLocked' :
        'emergencyCallsOnly-ruimServiceProviderLocked'
    };
    this.properties.networks2G = ['gsm', 'gprs', 'edge'];
  };
  LockScreenConnectionStatesWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenConnectionStatesWidget.prototype.setup = function() {
    return (new LockScreenConnectionStatesWidgetSetup(this));
  };
  exports.LockScreenConnectionStatesWidget = LockScreenConnectionStatesWidget;
})(window);

