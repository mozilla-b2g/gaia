'use strict';

/*
 * An Updatable object represents an application *or* system update.
 * It takes care of the interaction with the UpdateManager and observes
 * the update itself to handle success/error cases.
 *
 * - name of the update
 * - size of the update
 * - download() to start the download
 * - cancelDownload() to cancel it
 */

/* === App Updates === */
function AppUpdatable(app) {
  this._mgmt = navigator.mozApps.mgmt;
  this.app = app;

  this.name = app.manifest.name;
  this.size = app.updateManifest ? app.updateManifest.size : null;
  app.ondownloadavailable = this.availableCallBack.bind(this);
  app.ondownloaderror = this.errorCallBack.bind(this);
  app.ondownloadsuccess = this.successCallBack.bind(this);
  app.ondownloadapplied = this.appliedCallBack.bind(this);
}

AppUpdatable.prototype.download = function() {
  this.app.download();
  UpdateManager.addToDownloadsQueue(this);
};

AppUpdatable.prototype.cancelDownload = function() {
  this.app.cancelDownload();
  UpdateManager.removeFromDownloadsQueue(this);
};

AppUpdatable.prototype.uninit = function() {
  this.app.ondownloadavailable = null;
  this.app.ondownloaderror = null;
  this.app.ondownloadsuccess = null;
  this.app.ondownloadapplied = null;
};

AppUpdatable.prototype.availableCallBack = function() {
  this.size = this.app.updateManifest ?
    this.app.updateManifest.size : null;
  UpdateManager.addToUpdatesQueue(this);
};

AppUpdatable.prototype.successCallBack = function() {
  var app = this.app;
  if (WindowManager.getDisplayedApp() !== app.origin) {
    this.applyUpdate();
  } else {
    var self = this;
    window.addEventListener('appwillclose', function waitClose() {
      window.removeEventListener('appwillclose', waitClose);
      self.applyUpdate();
    });
  }

  UpdateManager.removeFromDownloadsQueue(this);
};

AppUpdatable.prototype.applyUpdate = function() {
  WindowManager.kill(this.app.origin);
  this._mgmt.applyDownload(this.app);
};

AppUpdatable.prototype.appliedCallBack = function() {
  UpdateManager.removeFromUpdatesQueue(this);
};

AppUpdatable.prototype.errorCallBack = function() {
  UpdateManager.requestErrorBanner();
  UpdateManager.removeFromDownloadsQueue(this);
};


/* === System Updates === */
function SystemUpdatable(downloadSize) {
  var _ = navigator.mozL10n.get;
  this.name = _('systemUpdate');
  this.size = downloadSize;
  window.addEventListener('mozChromeEvent', this);
}

SystemUpdatable.prototype.download = function() {
  this._dispatchEvent('update-available-result', 'download');
  UpdateManager.addToDownloadsQueue(this);
};

SystemUpdatable.prototype.cancelDownload = function() {
  // Not implemented yet https://bugzilla.mozilla.org/show_bug.cgi?id=804571
};

SystemUpdatable.prototype.uninit = function() {
  window.removeEventListener('mozChromeEvent', this);
};

SystemUpdatable.prototype.handleEvent = function(evt) {
  if (evt.type !== 'mozChromeEvent')
    return;

  var detail = evt.detail;
  if (!detail.type)
    return;

  switch (detail.type) {
    case 'update-error':
      this.errorCallBack();
      break;
    case 'update-downloaded':
    case 'update-prompt-apply':
      this.showApplyPrompt();
      break;
  }
};

SystemUpdatable.prototype.errorCallBack = function() {
  UpdateManager.requestErrorBanner();
  UpdateManager.removeFromDownloadsQueue(this);
};

SystemUpdatable.prototype.showApplyPrompt = function() {
  var _ = navigator.mozL10n.get;

  var cancel = {
    title: _('later'),
    callback: this.declineInstall.bind(this)
  };

  var confirm = {
    title: _('installNow'),
    callback: this.acceptInstall.bind(this)
  };

  CustomDialog.show(_('updateReady'), _('wantToInstall'),
                    cancel, confirm);
};

SystemUpdatable.prototype.declineInstall = function() {
  CustomDialog.hide();
  this._dispatchEvent('update-prompt-apply-result', 'wait');
};

SystemUpdatable.prototype.acceptInstall = function() {
  CustomDialog.hide();
  this._dispatchEvent('update-prompt-apply-result', 'restart');
};

SystemUpdatable.prototype._dispatchEvent = function(type, result) {
  var event = document.createEvent('CustomEvent');
  var data = { type: type };
  if (result) {
    data.result = result;
  }

  event.initCustomEvent('mozContentEvent', true, true, data);
  window.dispatchEvent(event);
};
