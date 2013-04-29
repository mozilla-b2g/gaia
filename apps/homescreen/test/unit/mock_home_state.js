'use strict';

var MockHomeState = {
  init: function mhs_init(eachPageCallback, successCallback, errorCallback) {
    // first page is the dock, let's say it's empty
    eachPageCallback({ index: 0, icons: [] });
    successCallback();
  },

  saveGrid: function mhs_saveGrid(state) {
    this.mLastSavedGrid = state;
  },

  mLastSavedGrid: null,

  mTeardown: function mhs_mTeardown() {
    this.mLastSavedGrid = null;
  }
};
