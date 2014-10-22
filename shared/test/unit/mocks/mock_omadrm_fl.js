console.time("mock_omadrm_fl.js");
/* global define */
define(function() {
  'use strict';

  var ctor = {
    mUnlocked: false,

    unlockBlob: function(secret, blob, callback) {
      callback(this.mUnlocked);
    },
    mSetupUnlocked: function(value) {
      this.mUnlocked = value;
    },
    get mimeSubtype() {
      return this.mockMimeSubtype;
    },
    mSetupMimeSubtype: function(value) {
      this.mockMimeSubtype = value;
    },
    getKey: function(callback) {
      callback();
    },
    getOrCreateKey: function() {
    }
  };

  return ctor;
});
console.timeEnd("mock_omadrm_fl.js");
