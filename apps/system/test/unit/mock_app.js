var idGen = 0;

function MockApp() {
  this.origin = 'https://testapp.gaiamobile.org';
  this.manifest = {
    name: 'Mock app'
  };
  this.updateManifest = {
    size: 42
  };

  this.removable = true;
  this.installState = 'installed';
  this.downloadAvailable = false;

  this.mId = idGen++;
  this.mDownloadCalled = false;
  this.mCancelCalled = false;
}

MockApp.prototype.download = function() {
  this.mDownloadCalled = true;
};

MockApp.prototype.cancelDownload = function() {
  this.mCancelCalled = true;
};

MockApp.prototype.mTriggerDownloadAvailable = function() {
  this.downloadAvailable = true;
  if (this.ondownloadavailable) {
    this.ondownloadavailable();
  }
};

MockApp.prototype.mTriggerDownloadSuccess = function() {
  this.downloadAvailable = false;
  if (this.ondownloadsuccess) {
    this.ondownloadsuccess();
  }
};

MockApp.prototype.mTriggerDownloadError = function() {
  this.downloadAvailable = true;
  if (this.ondownloaderror) {
    this.ondownloaderror();
  }
};

MockApp.prototype.mTriggerDownloadApplied = function() {
  this.downloadAvailable = false;
  if (this.ondownloadapplied) {
    this.ondownloadapplied();
  }
};
