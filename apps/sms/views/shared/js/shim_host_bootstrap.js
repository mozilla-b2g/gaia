/* global DeviceStorageShim,
          MozMobileConnectionsShim,
          MozMobileMessageShim,
          MozSettingsShim
*/

(function(exports) {
'use strict';

exports.bootstrap = function(appInstanceId) {
  MozSettingsShim.init(navigator.mozSettings);
  MozMobileMessageShim.init(appInstanceId, navigator.mozMobileMessage);
  MozMobileConnectionsShim.init(appInstanceId, navigator.mozMobileConnections);
  DeviceStorageShim.init(appInstanceId, navigator.getDeviceStorage('apps'));
};
})(self);
