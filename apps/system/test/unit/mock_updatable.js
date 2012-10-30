function MockUpdatable(aTarget) {
  this.target = aTarget;

  this.mDownloadCalled = false;
  this.mCancelCalled = false;
  this.mUninitCalled = false;
}

MockUpdatable.prototype.uninit = function() {
  this.mUninitCalled = true;
};

MockUpdatable.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockUpdatable.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};
