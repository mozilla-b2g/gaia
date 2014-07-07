'use strict';

var MockVersionHelper = {

  mIsUpgrade: false,
  mVersionInfo: {
    isUpgrade: function() {
      return MockVersionHelper.mIsUpgrade;
    }
  },

  getVersionInfo: function() {
    return {
      then: function(cb) {
        cb(MockVersionHelper.mVersionInfo);
      }
    };
  }
};
