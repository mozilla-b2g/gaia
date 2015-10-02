/* global BridgeServiceMixin,
          BroadcastChannel
*/

/* exported DeviceStorageShim */

(function(exports) {
'use strict';

/**
 * Name of the service for device storage API shim.
 * @type {string}
 */
const SERVICE_NAME = 'device-storage-shim';

const EVENTS = ['change'];

const METHODS = ['lowDiskSpace'];

var deviceStorage = null;

var DeviceStorageShim = {
  init(appInstanceId, realDeviceStorage) {
    if (!realDeviceStorage) {
      console.error('Invalid deviceStorage for shim initialization');
      return;
    }

    deviceStorage = realDeviceStorage;

    EVENTS.forEach((event) => {
      deviceStorage.addEventListener(event, (evt) => {
        // Workaround to avoid the duplicated events by inserting
        // appInstanceId into event name in bridge mixin.
        evt.appInstanceId = appInstanceId;
        this.broadcast(event, evt);
      });
    });

    this.initService(
      new BroadcastChannel(`${SERVICE_NAME}-channel-${appInstanceId}`)
    );
  },

  lowDiskSpace() {
    return deviceStorage.lowDiskSpace;
  }
};

exports.DeviceStorageShim = Object.seal(
  BridgeServiceMixin.mixin(
    DeviceStorageShim,
    SERVICE_NAME,
    { events: EVENTS,
      methods: METHODS }
  )
);

}(this));
