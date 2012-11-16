var idGen = 0;

function MockApp(opts) {
  /* default values */
  this.origin = 'https://testapp.gaiamobile.org';
  this.manifest = {
    name: 'Mock app'
  };
  this.updateManifest = {
    size: 42,
    name: 'Mock packaged app'
  };

  this.removable = true;
  this.installState = 'installed';
  this.downloadAvailable = false;

  this.mId = idGen++;
  this.mDownloadCalled = false;
  this.mCancelCalled = false;

  /* overwrite default values with whatever comes in "opts" from the test */
  if (opts) {
    for (var key in opts) {
      this[key] = opts[key];
    }
  }
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
    this.ondownloadavailable({
        application: this
    });
  }
};

MockApp.prototype.mTriggerDownloadSuccess = function() {
  this.downloadAvailable = false;
  if (this.ondownloadsuccess) {
    this.ondownloadsuccess({
        application: this
    });
  }
};

MockApp.prototype.mTriggerDownloadError = function() {
  this.downloadAvailable = true;
  if (this.ondownloaderror) {
    this.ondownloaderror({
        application: this
    });
  }
};

MockApp.prototype.mTriggerDownloadProgress = function(progress) {
  this.progress = progress;
  if (this.onprogress) {
    this.onprogress({
        application: this
    });
  }
};

MockApp.prototype.mTriggerDownloadApplied = function() {
  this.downloadAvailable = false;
  if (this.ondownloadapplied) {
    this.ondownloadapplied({
        application: this
    });
  }
};
