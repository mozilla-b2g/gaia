/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported StoreProvisioning */

'use strict';

/**
 * The StoreProvisioning singleton is a database helper in charge of storing the
 * APNs into the settings database.
 *
 */
var StoreProvisioning = (function() {
  var CP_APN_KEY = 'ril.data.cp.apns';

  var MCC_KEY = 'operatorvariant.mcc';

  var MNC_KEY = 'operatorvariant.mnc';

  var mccMncCodes = { mcc: '000', mnc: '00' };

  /**
   * Loads the operator numeric value (MCC and MNC codes) stored into the
   * settings database. The APNs are stored relaying on these codes.
   *
   * @param {function} callback It will be called once the work is done (only
   *                            useful for unit testing). This function doesn't
   *                            any parameter.
   */
  function sp_getMccMncCodes(callback) {
    var settings = navigator.mozSettings;
    if (!settings) {
      if (callback) {
        callback();
      }
      return;
    }

    var transaction = navigator.mozSettings.createLock();
    var mccRequest = transaction.get(MCC_KEY);
    mccRequest.onsuccess = function() {
      mccMncCodes.mcc = mccRequest.result[MCC_KEY] || '000';
      var mncRequest = transaction.get(MNC_KEY);
      mncRequest.onsuccess = function() {
        mccMncCodes.mnc = mncRequest.result[MNC_KEY] || '00';
        callback(mccMncCodes.mcc, mccMncCodes.mnc);
      };
    };
  }

  /**
   * Stores the APNs into the settings database.
   *
   * @param {Array} parameters The array containing the APNs.
   * @param {function} callback It will be called once the work is done (only
   *                            useful for unit testing). This function doesn't
   *                            accetp any parameter.
   */
  function sp_provision(parameters, callback) {
    var existingApns = null;
    var newApns = {};

    var settings = navigator.mozSettings;
    if (!settings) {
      if (callback) {
        callback();
      }
      return;
    }
    sp_getMccMncCodes(function sp_getMccMncCodesCb() {
      var transaction = navigator.mozSettings.createLock();
      var load = transaction.get(CP_APN_KEY);
      load.onsuccess = function onsuccessCb() {
        existingApns = load.result[CP_APN_KEY];
        var data = {}, mcc = mccMncCodes.mcc, mnc = mccMncCodes.mnc;

        if (!existingApns) {
          newApns[mcc] = {};
          newApns[mcc][mnc] = parameters;
          data[CP_APN_KEY] = newApns;
        } else {
          if (!existingApns[mcc]) {
            existingApns[mcc] = {};
          }
          if (!existingApns[mcc][mnc]) {
            existingApns[mcc][mnc] = [];
          }
          // TODO: Should we handle possible duplicated APNs?
          existingApns[mcc][mnc] = existingApns[mcc][mnc].concat(parameters);
          data[CP_APN_KEY] = existingApns;
        }
        transaction.set(data);
        if (callback) {
          callback();
        }
      };
      load.onerror = function onerrorCb() {
        if (callback) {
          callback();
        }
      };
    });
  }

  return {
    getMccMncCodes: sp_getMccMncCodes,
    provision: sp_provision
  };
})();
