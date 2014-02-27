
'use strict';

var realMozDownloadManager = navigator.mozDownloadManager;

navigator.mozDownloadManager = {
  // Should always be an array of DOM Download like objects.
  mDownloads: [],

  mSuiteTeardown: function mdm_mSuiteTeardown() {
    window.navigator.mozDownloadManager = realMozDownloadManager;
  },

  clearAllDone: function() {
    this.mDownloads = this.mDownloads.filter(function(download) {
      if (download.state === 'succeeded' || download.state === 'finalized') {
        return false;
      }
      return true;
    });
  },

  getDownloads: function() {
    return this.mDownloads;
  }
};
