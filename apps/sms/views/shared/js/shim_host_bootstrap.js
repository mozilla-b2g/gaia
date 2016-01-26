/* global ActivityShim,
          MozMobileConnectionsShim,
          MozMobileMessageShim,
          MozSettingsShim
*/

(function(exports) {
'use strict';

exports.bootstrap = function(appInstanceId) {
  // We can't handle system messages inside iframe right now, so we access
  // parent window here. This should be removed once bug 818000 is resolved.
  ActivityShim.init(appInstanceId, parent.mozSetMessageHandler);
  MozSettingsShim.init(navigator.mozSettings);
  MozMobileMessageShim.init(appInstanceId, navigator.mozMobileMessage);
  MozMobileConnectionsShim.init(appInstanceId, navigator.mozMobileConnections);
};
})(self);
