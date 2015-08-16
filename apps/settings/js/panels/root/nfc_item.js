/**
 * The moudle supports displaying nfc toggle on an element.
 *
 * @module panels/root/nfc_item
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  /**
   * @alias module:panels/root/nfc_item
   * @class NFCItem
   * @param {Object} elements
   * @param {HTMLElement} elements.nfcMenuItem
   * @param {HTMLElement} elements.nfcCheckBox
   * @returns {NFCItem}
   */
  function NFCItem(elements) {
    if (!navigator.mozNfc) {
      return;
    }
    elements.nfcMenuItem.hidden = false;
    this._checkbox = elements.nfcCheckBox;
    this._checkbox.addEventListener('change', () => this._onCheckboxChanged());

    SettingsListener.observe('nfc.status', undefined,
                             (status) => this._onNfcStatusChanged(status));
  }

  NFCItem.prototype = {
    // disabling on change to prevent double clicking and remove toggle
    // flickering before nfcManger will change nfc.status
    _onCheckboxChanged: function ni_onCheckboxChanged() {
      this._checkbox.setAttribute('disabled', true);
    },

    _onNfcStatusChanged: function ni_onNfcStatusChanged(status) {
      if (status === 'enabling' || status === 'disabling') {
        this._checkbox.setAttribute('disabled', true);
      } else if (status === 'enabled' || status === 'disabled') {
        this._checkbox.removeAttribute('disabled');
      }
    }
  };

  return function ctor_nfcItem(elements) {
    return new NFCItem(elements);
  };
});
