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
      // do not show NFC section if mozNfc API is not available
      elements.nfcMenuItem.hidden = true;
      return;
    }
    elements.nfcMenuItem.hidden = false;
    this._checkbox = elements.nfcCheckBox;

    this._boundOnCheckboxChanged = this._onCheckboxChanged.bind(this);
    this._boundNfcStatusChanged = this._onNfcStatusChanged.bind(this);

    this._init();
  }

  NFCItem.prototype = {
    _init: function ni_init() {
      this._checkbox.addEventListener('change', this._boundOnCheckboxChanged);
      SettingsListener.observe('nfc.status', undefined,
                               this._boundNfcStatusChanged);
    },

    _onCheckboxChanged: function ni_onCheckboxChanged() {
      this._checkbox.disabled = true;
    },

    _onNfcStatusChanged: function ni_onNfcStatusChanged(status) {
      if (this._checkbox.disabled &&
          ['enabled', 'disabled'].indexOf(status) !== -1) {
        this._checkbox.disabled = false;
        this._checkbox.checked = (status === 'enabled') ? true : false;
      }
    }
  };

  return function ctor_nfcItem(elements) {
    return new NFCItem(elements);
  };
});
