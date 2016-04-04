/* global BridgeServiceMixin,
          BroadcastChannel,
          MozSettingsShim
*/

/* exported MozMobileConnectionsShim */

(function(exports) {
'use strict';

/**
 * Name of the service for mozMobileConnections API shim.
 * @type {string}
 */
const SERVICE_NAME = 'moz-mobile-connections-shim';

/**
 * Array of method names that need to be exposed for API shim.
 * @type {Array.<string>}
 */
const METHODS = Object.freeze(['getServiceIdByIccId', 'switchMmsSimHandler']);

var mozMobileConnections = null;

function setMmsSimServiceId(id) {
  // DSDS: mms & data are both necessary for connection switch.
  MozSettingsShim.set({
    'ril.mms.defaultServiceId': id,
    'ril.data.defaultServiceId': id
  });
}

var MozMobileConnectionsShim = {
  init(appInstanceId, conns) {
    if (!conns) {
      console.error('Invalid mozMobileConnections for shim initialization');
      return;
    }

    mozMobileConnections = conns;

    this.initService(
      new BroadcastChannel(`${SERVICE_NAME}-channel-${appInstanceId}`)
    );
  },

  /* Methods */

  /**
   * Shim for returning the service id that matches the icc id.
   * @param {string} iccId Id that could map to the target SIM.
   * @returns {?number} matched service id or null if unmatched.
   */
  getServiceIdByIccId(iccId) {
    var index = Array.prototype.findIndex.call(mozMobileConnections, (conn) =>
      iccId === conn.iccId
    );

    return index > -1 ? index : null;
  },

  /**
   * Switching the default mms/data service id by icc id.
   * @param {string} iccId Id that could map to the target SIM.
   * @returns {Promise} Promise that returned when sim switching is ready or
   *  failed.
   */
  switchMmsSimHandler(iccId) {
    var serviceId = this.getServiceIdByIccId(iccId);

    if (serviceId === null) {
      return Promise.reject('NoSimCardError');
    }

    var conn = mozMobileConnections[serviceId];

    if (conn.data.state === 'registered') {
      // Call resolve directly if state is registered already
      return Promise.resolve();
    }

    return new Promise(function(resolve) {
      // Listen to MobileConnections datachange to make sure we can start
      // to retrieve mms only when data.state is registered. But we can't
      // guarantee datachange event will work in other device.
      conn.addEventListener('datachange', function onDataChange() {
        if (conn.data.state === 'registered') {
          conn.removeEventListener('datachange', onDataChange);
          resolve();
        }
      });

      setMmsSimServiceId(serviceId);
    });
  }
};

exports.MozMobileConnectionsShim = Object.seal(
  BridgeServiceMixin.mixin(
    MozMobileConnectionsShim,
    SERVICE_NAME,
    { methods: METHODS }
  )
);

}(this));
