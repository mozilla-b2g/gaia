'use strict';

/* exported MockCallLog */

var MockCallLog = {
  mCallLogEditModeButtonHidden: false,
  init: function() {},
  appendGroup: function(group) {
  },
  showEditModeButton: function() {
    this.mCallLogEditModeButtonHidden = false;
  },
  hideEditModeButton: function() {
    this.mCallLogEditModeButtonHidden = true;
  },
  mShutdown() {
    this.mCallLogEditModeButtonHidden = false;
  }
};

