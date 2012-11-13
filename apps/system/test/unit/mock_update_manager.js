var MockUpdateManager = {
  addToUpdatesQueue: function mum_addtoUpdateQueue(updatable) {
    this.mLastUpdatesAdd = updatable;
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

  requestErrorBanner: function mum_requestErrorBanner() {
    this.mErrorBannerRequested = true;
  },

  mErrorBannerRequested: false,
  mLastUpdatesAdd: null,
  mLastUpdatesRemoval: null,
  mLastDownloadsAdd: null,
  mLastDownloadsRemoval: null,
  mTeardown: function mum_mTeardown() {
    this.mErrorBannerRequested = false;
    this.mLastUpdatesAdd = null;
    this.mLastUpdatesRemoval = null;
    this.mLastDownloadsAdd = null;
    this.mLastDownloadsRemoval = null;
  }
};
