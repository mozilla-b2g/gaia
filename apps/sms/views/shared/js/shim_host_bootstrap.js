/* global MozMobileConnectionsShim,
          MozMobileMessageShim,
          MozSettingsShim
*/

(function(exports) {
'use strict';

exports.bootstrap = function(appInstanceId) {
  MozSettingsShim.init(navigator.mozSettings);
  MozMobileMessageShim.init(appInstanceId, navigator.mozMobileMessage);
  MozMobileConnectionsShim.init(appInstanceId, navigator.mozMobileConnections);
};
})(self);
