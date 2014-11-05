/* exported MockPermissionSettings */

'use strict';

var MockPermissionSettings = {
  permissions: {},
  mSetup: function() {
    this.permissions = {};
  },

  set: function(permission, value, manifest, origin, browserFlag) {
    this.permissions[permission] = value;
  },

  mTeardown: function() {
    this.permissions = {};
  },

  get: function(permission, manifest, origin, browserFlag) {
    return this.permissions[permission];
  },

  isExplicit: function(permission, manifest, origin, browserFlag) {
    return !!this.permissions[permission];
  }
};
