'use strict';

var MockHomeState = {
  mTestGrids: null,

  init: function mhs_init(eachPageCallback, successCallback, errorCallback) {
    var grid = this.mTestGrids || [{ index: 0, icons: [] }];

    grid.forEach(eachPageCallback);
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
    this.mTestGrids = null;
  }
};
