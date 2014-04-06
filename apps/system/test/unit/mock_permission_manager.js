/* exported MockPermissionManager */

'use strict';

function MockPermissionManager() {
}

MockPermissionManager.prototype = {
  currentOrigin: undefined,
  currentPermission: undefined,
  currentPermissions: undefined,
  currentChoices: {},
  fullscreenRequest: undefined,
  isVideo: false,
  isAudio: false,
  start: function() {},
  stop: function() {}
};
