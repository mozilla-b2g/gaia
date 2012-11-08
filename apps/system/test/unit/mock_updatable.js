function MockAppUpdatable(aApp) {
  this.app = aApp;

  this.mDownloadCalled = false;
  this.mCancelCalled = false;
  this.mUninitCalled = false;
}

MockAppUpdatable.prototype.uninit = function() {
  this.mUninitCalled = true;
};

MockAppUpdatable.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockAppUpdatable.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};

function MockSystemUpdatable(downloadSize) {
  this.size = downloadSize;
  this.name = 'systemUpdate';

  this.mDownloadCalled = false;
  this.mCancelCalled = false;
  this.mUninitCalled = false;
}

MockSystemUpdatable.prototype.uninit = function() {
  this.mUninitCalled = true;
};

MockSystemUpdatable.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockSystemUpdatable.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};
