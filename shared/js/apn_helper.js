/**
 * @fileoverview This file provides common helper functions used to manipulate
 *               access point names (APNs)
 */

/* exported ApnHelper */

(function(exports) {
  'use strict';

  /**
   * List of data network types, see source/dom/system/gonk/ril_consts.js in
   * mozilla-central. Those match the equivalent Android integer types.
   */
  var NETWORK_TYPES = [
    null,
    'gprs',
    'edge',
    'umts',
    'is95a',
    'is95b',
    '1xrtt',
    'evdo0',
    'evdoa',
    'hsdpa',
    'hsupa',
    'hspa',
    'evdob',
    'ehrpd',
    'lte',
    'hspa+',
    'gsm'
  ];

  /**
   * Filter a list of APNs by network type. This involves comparing the bearer
   * field if present to the data network type and checking if they match. If
   * the bearer value of an APN is not defined or is set to 0 then we consider
   * the APN compatible with any network.
   *
   * @param {Array} apns An array of APNs
   * @param {String} type The network type which the APNs must be compatible
   *                 with
   */
  function ah_filterByBearer(apns, type) {
    var typeIdx = NETWORK_TYPES.indexOf(type);

    for (var i = 0; i < apns.length; i++) {
      var bearer = apns[i].bearer ? +apns[i].bearer : 0;

      if (bearer && (bearer !== typeIdx)) {
        // This APN is incompatible, remove it from the array
        apns.splice(i, 1);
      }
    }
  }

  /**
   * Get an APN from the specified list which is compatible with the specified
   * MCC, MNC and connection type
   *
   * @param {Object} list The global APN list, the format should be the same as
   *        the one used in apn.json
   * @param {Integer} mcc The mobile country code
   * @param {Integer} mnc The mobile network code
   * @param {String} type The network type which the filtered APNs must be
   *                 compatible with
   *
   * @return {Array} A list of compatible APNs
   */
  function ah_getCompatible(list, mcc, mnc, type) {
    var apns = list[mcc] ? (list[mcc][mnc] || []) : [];

    ah_filterByBearer(apns, type);

    return apns;
  }

  var ApnHelper = {
    getCompatible: ah_getCompatible
  };

  exports.ApnHelper = ApnHelper;
})(this);
