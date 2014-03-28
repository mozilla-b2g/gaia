/* exported MockPermissionSettings */

'use strict';

var MockPermissionSettings = {
  mSetup: function() {
    this.permissions = {};
  },

  set: function(permission, value, manifest, origin, browserFlag) {
    this.permissions[permission] = value;
  },

  mTeardown: function() {
    this.permissions = {};
  }
};
