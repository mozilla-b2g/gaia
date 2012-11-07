'use strict';

/*
 * An Updatable object represents an application *or* system update.
 * It takes care of the interaction with the UpdateManager and observes
 * the update itself to handle success/error cases.
 *
 * - download() to start the download
 * - cancelDownload() to cancel it
 */

function Updatable(target) {
  this._mgmt = navigator.mozApps.mgmt;
  this.target = target;

  if (target === 'system') {
    this._system = true;
    window.addEventListener('mozChromeEvent', this);
    return;
  }

  this._system = false;
  target.ondownloadavailable = this.availableCallBack.bind(this);
  target.ondownloaderror = this.errorCallBack.bind(this);
  target.ondownloadsuccess = this.successCallBack.bind(this);
  target.ondownloadapplied = this.appliedCallBack.bind(this);
}

Updatable.prototype.download = function() {
  if (this._system) {
    this._dispatchEvent('update-available-result', 'download');
  } else {
    this.target.download();
  }

  UpdateManager.addToDownloadsQueue(this);
};

Updatable.prototype.cancelDownload = function() {
  if (this._system) {
    // Not implemented yet https://bugzilla.mozilla.org/show_bug.cgi?id=804571
    return;
  }

  this.target.cancelDownload();
  UpdateManager.removeFromDownloadsQueue(this);
};

Updatable.prototype.uninit = function() {
  if (this._system) {
    window.removeEventListener('mozChromeEvent', this);
  } else {
    this.target.ondownloadavailable = null;
    this.target.ondownloaderror = null;
    this.target.ondownloadsuccess = null;
    this.target.ondownloadapplied = null;
  }
};

Updatable.prototype.availableCallBack = function() {
  UpdateManager.addToUpdatesQueue(this);
};

Updatable.prototype.errorCallBack = function() {
  UpdateManager.requestErrorBanner();
  UpdateManager.removeFromDownloadsQueue(this);
};

Updatable.prototype.successCallBack = function() {
  var target = this.target;
  if (WindowManager.getDisplayedApp() !== target.origin) {
    this.applyUpdate()
  } else {
    var self = this;
    window.addEventListener('appwillclose', function waitClose() {
      window.removeEventListener('appwillclose', waitClose);
      self.applyUpdate();
    });
  }

  UpdateManager.removeFromDownloadsQueue(this);
};

Updatable.prototype.applyUpdate = function() {
  WindowManager.kill(this.target.origin);
  this._mgmt.applyDownload(this.target);
};

Updatable.prototype.appliedCallBack = function() {
  UpdateManager.removeFromUpdatesQueue(this);
};

Updatable.prototype.handleEvent = function(evt) {
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

Updatable.prototype.showApplyPrompt = function() {
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

Updatable.prototype.declineInstall = function() {
  CustomDialog.hide();
  this._dispatchEvent('update-prompt-apply-result', 'wait');
};

Updatable.prototype.acceptInstall = function() {
  CustomDialog.hide();
  this._dispatchEvent('update-prompt-apply-result', 'restart');
};

Updatable.prototype._dispatchEvent = function(type, result) {
  var event = document.createEvent('CustomEvent');
  var data = { type: type };
  if (result) {
    data.result = result;
  }

  event.initCustomEvent('mozContentEvent', true, true, data);
  window.dispatchEvent(event);
};
