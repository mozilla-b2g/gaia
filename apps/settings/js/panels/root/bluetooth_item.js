/**
 * The moudle supports displaying bluetooth information on an element.
 *
 * @module panels/root/bluetooth_item
 */
define(function(require) {
  'use strict';

  var Bluetooth = require('modules/bluetooth');
  /**
   * @alias module:panels/root/bluetooth_item
   * @class BluetoothItem
   * @requires module:modules/bluetooth
   * @param {HTMLElement} element
                          The element displaying the bluetooth information
   * @return {BluetoothItem}
   */
  function BluetoothItem(element) {
    this._enabled = false;
    this._element = element;
    this._boundRefreshMenuDescription =
      this._refreshMenuDescription.bind(this, element);
  }

  BluetoothItem.prototype = {
    /**
     * Refresh the text based on the Bluetooth module enabled/disabled,
     * paired devices information.
     *
     * @access private
     * @memberOf BluetoothItem.prototype
     * @param {HTMLElement} element
                            The element displaying the bluetooth information
     */
    _refreshMenuDescription: function bt__refreshMenuDescription(element) {
      if (!navigator.mozL10n) {
        return;
      }

      if (Bluetooth.enabled) {
        if (Bluetooth.numberOfPairedDevices === 0) {
          element.setAttribute('data-l10n-id', 'bt-status-nopaired');
        } else {
          navigator.mozL10n.setAttributes(element, 'bt-status-paired',
            {
              name: Bluetooth.firstPairedDeviceName,
              n: Bluetooth.numberOfPairedDevices - 1
            });
        }
      } else {
        element.setAttribute('data-l10n-id', 'bt-status-turnoff');
      }
    },

    /**
     * The value indicates whether the module is responding.
     *
     * @access public
     * @memberOf BluetoothItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      if (this._enabled === value) {
        return;
      }

      this._enabled = value;
      if (this._enabled) {
        Bluetooth.observe('enabled', this._boundRefreshMenuDescription);
        Bluetooth.observe('numberOfPairedDevices',
          this._boundRefreshMenuDescription);
        this._boundRefreshMenuDescription();
      } else {
        Bluetooth.unobserve('enabled', this._boundRefreshMenuDescription);
        Bluetooth.unobserve('numberOfPairedDevices',
          this._boundRefreshMenuDescription);
      }
    }
  };

  return function ctor_bluetoothItem(element) {
    return new BluetoothItem(element);
  };
});
