/**
 * Show hardware informations
 *
 * @module about_more_info/hardwareInfo
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var BtContext = require('modules/bluetooth/bluetooth_context');

  /**
   * @alias module:about_more_info/HardwareInfo
   * @class HardwareInfo
   * @returns {HardwareInfo}
   */
  var HardwareInfo = function() {
    this._elements = {};
  };

  HardwareInfo.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf HardwareInfo.prototype
     * @param {HTMLElement} elements
     */
    init: function mi_init(elements) {
      this._elements = elements;

      this._loadMacAddress();
      this._loadBluetoothAddress();
    },

    /**
     * observe and show MacAddress.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadMacAddress: function mi__loadMacAddress() {
      SettingsListener.observe('deviceinfo.mac', '', (macAddress) =>
        this._elements.deviceInfoMac.textContent = macAddress);
    },

    /**
     * refreshing the address field only.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param  {String} address Bluetooth address
     */
    _refreshBluetoothAddress: function mi__refreshBluetoothAddress(address) {
      // update btAddr
      if (address == null || address === '') {
        this._elements.btAddr.setAttribute('data-l10n-id',
                                           'bluetooth-address-unavailable');
      } else {
        this._elements.btAddr.removeAttribute('data-l10n-id');
        this._elements.btAddr.textContent = address;
      }
    },

    /**
     * load Bluetooth address.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadBluetoothAddress: function about_loadBluetoothAddress() {
      BtContext.observe('address', this._refreshBluetoothAddress.bind(this));
      this._refreshBluetoothAddress(BtContext.address);
    }
  };

  return function ctor_hardwareInfo() {
    return new HardwareInfo();
  };
});
