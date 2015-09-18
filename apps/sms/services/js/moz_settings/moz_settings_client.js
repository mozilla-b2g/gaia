/* global bridge,
          BroadcastChannel */

(function(exports) {
'use strict';

/**
 * Name of the service that is responsible for settings functionality.
 * @type {string}
 */
const SERVICE_NAME = 'moz-settings-shim';

/**
 * Disable default client timeout from bridge by setting the timeout to false.
 * @type {number|boolean}
 */
const TIMEOUT = false;

const MMS_SIZE_LIMIT_KEY = 'dom.mms.operatorSizeLimitation';
const SMS_MAX_CONCAT_KEY = 'operatorResource.sms.maxConcat';

// We set the default maximum concatenated number of our SMS app to 10
// based on:
// https://bugzilla.mozilla.org/show_bug.cgi?id=813686#c0
const MAX_CONCATENATED_MESSAGES = 10;
// Default mms message size limitation is 295K
const MMS_SIZE_LIMITATION = 295 * 1024;
// we evaluate to 5KB the size overhead of wrapping a payload in a MMS
const MMS_SIZE_OVERHEAD = 5 * 1024;

/**
 * Reference to active bridge client instance.
 *
 * @type {Client}
 */
var client;

var MozSettingsClient = {
  /**
   * Initializes connection to mozSettingsShim hosted in iframe.
   * @param {string} appInstanceId Unique identifier of app instance
   * where client resides in.
   */
  init(appInstanceId) {
    if (!appInstanceId) {
      throw new Error('AppInstanceId is required!');
    }

    var broadcastChannelName = `${SERVICE_NAME}-channel-${appInstanceId}`;

    client = bridge.client({
      service: SERVICE_NAME,
      endpoint: new BroadcastChannel(broadcastChannelName),
      timeout: TIMEOUT
    });
  },

  /**
   * Limitation of the MMS size .
   * @returns {Promise} Promise of shim's method that returned the mms limit
   *  in Bytes. Default limitation is 295KB.
   */
  mmsSizeLimitation() {
    return client.method('get', MMS_SIZE_LIMIT_KEY).then((result) => {
      var size = result[MMS_SIZE_LIMIT_KEY];
      return size && !isNaN(size) ?
        size - MMS_SIZE_OVERHEAD : MMS_SIZE_LIMITATION;
    });
  },

  /**
   * Maximum concatenated number of our SMS.
   * @returns {Promise} Promise of shim's method that return number of maximum
   *  concatenated number of our SMS. Default maximum number is 10.
   */
  maxConcatenatedMessages() {
    return client.method('get', SMS_MAX_CONCAT_KEY).then((result) => {
      var num = result[SMS_MAX_CONCAT_KEY];
      return num && !isNaN(num) ? num : MAX_CONCATENATED_MESSAGES;
    });
  },

  /**
   * Check if device have mre than 1 active SIM.
   * @returns {boolean} true if the device has more than 1 SIM port and at least
   *  2 SIMs are inserted.
   */
  hasSeveralSim() {
    return navigator.mozIccManager &&
      navigator.mozIccManager.iccIds.length > 1;
  }
};

exports.MozSettingsClient = Object.freeze(
  MozSettingsClient
);

})(window);
