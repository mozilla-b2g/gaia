'use strict';
/* exported MockUtilityTray */

var MockUtilityTray = {
  init: function() {
  },

  show: function() {
    this.mShown = true;
  },

  hide: function() {
    this.mShown = false;
  },

  updateNotificationCount: function() {
  },

  mShown: false,
  mTeardown: function teardown() {
    this.mShown = false;
  }
};
