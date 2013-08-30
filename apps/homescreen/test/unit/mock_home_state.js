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

  saveSVInstalledApps: function mhs_saveSVInstalledApps(svApps) {
    this.mLastSavedInstalledApps = svApps;
  },

  getSVApps: function mhs_getSVApps() { },

  mLastSavedGrid: null,

  mLastSavedInstalledApps: null,

  mTeardown: function mhs_mTeardown() {
    this.mLastSavedGrid = null;
  }
};
