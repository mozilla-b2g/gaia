'use strict';

(function(exports) {
  /*
   * An Updatable object represents an application *or* system update.
   * It takes care of the interaction with the this.updateManager and observes
   * the update itself to handle success/error cases.
   *
   * - name of the update
   * - size of the update
   * - download() to start the download
   * - cancelDownload() to cancel it
   */

  /* === App Updates === */
  var AppUpdatable = function(app, updateManager) {
    this.updateManager = updateManager;
    this._mgmt = navigator.mozApps.mgmt;
    this.app = app;

    var manifest = app.manifest ? app.manifest : app.updateManifest;
    this.name = new ManifestHelper(manifest).name;
    this.nameL10nId = '';

    this.size = app.downloadSize;
    this.progress = null;

    this.updateManager.addToUpdatableApps(this);
    app.ondownloadavailable = this.availableCallBack.bind(this);
    if (app.downloadAvailable) {
      this.availableCallBack();
    }
    if (app.readyToApplyDownload) {
      this.applyUpdate();
    }
  };

  System.create(AppUpdatable);

  AppUpdatable.prototype.download = function() {
    this.updateManager.addToDownloadsQueue(this);
    this.progress = 0;

    this.app.download();
  };

  AppUpdatable.prototype.cancelDownload = function() {
    this.app.cancelDownload();
  };

  AppUpdatable.prototype.uninit = function() {
    this.app.ondownloadavailable = null;
    this.clean();
  };

  AppUpdatable.prototype.clean = function() {
    this.app.ondownloaderror = null;
    this.app.ondownloadsuccess = null;
    this.app.ondownloadapplied = null;
    this.app.onprogress = null;

    this.progress = null;
  };

  AppUpdatable.prototype.availableCallBack = function() {
    this.size = this.app.downloadSize;

    if (this.app.installState === 'installed') {
      this.updateManager.addToUpdatesQueue(this);

      // we add these callbacks only now to prevent interfering
      // with other modules (especially the AppInstallManager)
      this.app.ondownloaderror = this.errorCallBack.bind(this);
      this.app.ondownloadsuccess = this.successCallBack.bind(this);
      this.app.ondownloadapplied = this.appliedCallBack.bind(this);
      this.app.onprogress = this.progressCallBack.bind(this);
    }
  };

  AppUpdatable.prototype.successCallBack = function() {
    var app = this.app;
    if (System.topMostAppWindow &&
        System.topMostAppWindow !== app.origin) {
      this.applyUpdate();
    } else {
      var self = this;
      window.addEventListener('appwillclose', function waitClose() {
        window.removeEventListener('appwillclose', waitClose);
        self.applyUpdate();
      });
    }

    this.updateManager.downloaded(this);
    this.updateManager.removeFromDownloadsQueue(this);
    this.updateManager.removeFromUpdatesQueue(this);
  };

  AppUpdatable.prototype.applyUpdate = function() {
    AppWindowManager.kill(this.app.origin);
    this._mgmt.applyDownload(this.app);
  };

  AppUpdatable.prototype.appliedCallBack = function() {
    this.clean();
  };

  AppUpdatable.prototype.errorCallBack = function(e) {
    var app = e.application;
    var errorName = app.downloadError.name;
    console.info('downloadError event, error code is', errorName);
    this.updateManager.requestErrorBanner();
    this.updateManager.removeFromDownloadsQueue(this);
    if (!app.downloadAvailable) {
      this.updateManager.removeFromUpdatesQueue(this);
    }
    this.progress = null;
  };

  AppUpdatable.prototype.progressCallBack = function() {
    if (this.progress === null) {
      // this is the first progress
      this.updateManager.addToDownloadsQueue(this);
      this.progress = 0;
    }

    var delta = this.app.progress - this.progress;

    this.progress = this.app.progress;
    this.updateManager.downloadProgressed(delta);
  };
  exports.AppUpdatable = AppUpdatable;
}(window));
