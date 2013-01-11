'use strict';

var MockUpdateManager = {
  addToUpdatesQueue: function mum_addtoUpdateQueue(updatable) {
    this.mLastUpdatesAdd = updatable;
  },
  addToUpdatableApps: function mum_addToUpdatableApps(updatable) {
    this.mLastUpdatableAdd = updatable;
  },

  removeFromUpdatesQueue: function mum_removeFromUpdateQueue(updatable) {
    this.mLastUpdatesRemoval = updatable;
  },

  addToDownloadsQueue: function mum_addtoActiveDownloads(updatable) {
    this.mLastDownloadsAdd = updatable;
  },
  removeFromDownloadsQueue:
    function mum_removeFromActiveDownloads(updatable) {

    this.mLastDownloadsRemoval = updatable;
  },

  downloadProgressed: function mum_downloadProgressed(bytes) {
    this.mProgressCalledWith = bytes;
  },

  startedUncompressing: function mum_startedUncompressing() {
    this.mStartedUncompressingCalled = true;
  },

  requestErrorBanner: function mum_requestErrorBanner() {
    this.mErrorBannerRequested = true;
  },

  checkForUpdates: function mum_checkForUpdate(forced) {
    this.mCheckForUpdatesCalledWith = forced;
  },

  mErrorBannerRequested: false,
  mLastUpdatesAdd: null,
  mLastUpdatableAdd: null,
  mLastUpdatesRemoval: null,
  mLastDownloadsAdd: null,
  mLastDownloadsRemoval: null,
  mProgressCalledWith: null,
  mCheckForUpdatesCalledWith: null,
  mStartedUncompressingCalled: false,
  mTeardown: function mum_mTeardown() {
    this.mErrorBannerRequested = false;
    this.mLastUpdatesAdd = null;
    this.mLastUpdatableAdd = null;
    this.mLastUpdatesRemoval = null;
    this.mLastDownloadsAdd = null;
    this.mLastDownloadsRemoval = null;
    this.mProgressCalledWith = null;
    this.mCheckForUpdatesCalledWith = null;
    this.mStartedUncompressingCalled = false;
  }
};
