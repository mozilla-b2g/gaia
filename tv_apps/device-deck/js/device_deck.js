/* global SpatialNavigator, SharedUtils, KeyNavigationAdapter */

(function(exports) {
  'use strict';

  var DeviceDeck = function() {

  };

  DeviceDeck.prototype = {
    _navigableElements: [],

    _spatialNavigator: undefined,

    _keyNavigationAdapter: undefined,

    connectedDevicesContainer:
      document.getElementById('connected-devices-container'),

    newlyFoundDeviceContainer:
      document.getElementById('newly-found-device-container'),

    init: function() {
      this._keyNavigationAdapter = new KeyNavigationAdapter();
      this._keyNavigationAdapter.init();

      this._navigableElements =
        SharedUtils.nodeListToArray(
          document.querySelectorAll('.navigable:not(.app-banner)'));

      this._spatialNavigator = new SpatialNavigator(this._navigableElements);
      this._spatialNavigator.on('focus', this.onFocus.bind(this));

      this._keyNavigationAdapter.on('move', this.onMove.bind(this));

      this._spatialNavigator.focus();
    },

    onMove: function(key) {
      this._spatialNavigator.move(key);
    },

    onFocus: function(elem) {
      elem.focus();
    }
  };

  exports.deviceDeck = new DeviceDeck();
  exports.deviceDeck.init();

} (window));
