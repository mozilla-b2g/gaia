/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * A Simple Operator Variant Helper for use cases where we only need to
 * verify against the saved mcc/mnc pair. This does *not* verify against live
 * SIM card values. For that functionality and more, see
 * operator_variant_helper.js
 **/
var SimpleOperatorVariantHelper = {
  // The mozSettings key for the saved MCC.
  get MCC_SETTINGS_KEY() {
    return 'operatorvariant.mcc';
  },

  // The mozSettings key for the saved MNC.
  get MNC_SETTINGS_KEY() {
    return 'operatorvariant.mnc';
  },

  /**
   * Simple function to get the operator variant values (MCC / MNC pair) that
   * are cached. This function will not verify these values against the live SIM
   * card values.
   *
   * @param {Function} callback Callback that will receive the MCC / MNC values.
   *                            Function signature -- function(mcc, mnc) { ... }
   */
  getOperatorVariant: function(callback) {
    var transaction = window.navigator.mozSettings.createLock();
    var mccRequest = transaction.get(this.MCC_SETTINGS_KEY);

    mccRequest.onsuccess = (function() {
      var mcc = mccRequest.result[this.MCC_SETTINGS_KEY] || '0';
      var mncRequest = transaction.get(this.MNC_SETTINGS_KEY);
      mncRequest.onsuccess = (function() {
        var mnc = mncRequest.result[this.MNC_SETTINGS_KEY] || '0';
        callback(mcc, mnc);
      }).bind(this);
    }).bind(this);
  }
};
