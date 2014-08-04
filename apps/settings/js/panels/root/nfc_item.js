/**
 * The moudle supports displaying nfc toggle on an element.
 *
 * @module panels/root/nfc_item
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:panels/root/nfc_item
   * @class NFCItem
   * @param {HTMLElement} element
                          The element displaying the nfc toggle
   * @returns {NFCItem}
   */
  function NFCItem(element) {
    this._render(element);
  }

  NFCItem.prototype = {
    /**
     * Display the NFC item if mozNfc API exist.
     *
     * @access private
     * @memberOf NFCItem.prototype
     * @param {HTMLElement} element
                            The element displaying the NFC toggle
     */
    _render: function nfc_render(element) {
      // Check if NFC is available on platform, and update UI
      if (element) {
        element.hidden = !navigator.mozNfc;
      }
    }
  };

  return function ctor_nfcItem(element) {
    return new NFCItem(element);
  };
});
