
'use strict';

var realMozDownloadManager = navigator.mozDownloadManager;

navigator.mozDownloadManager = {
  mSuiteTeardown: function mdm_mSuiteTeardown() {
    window.navigator.mozDownloadManager = realMozDownloadManager;
  }
};
