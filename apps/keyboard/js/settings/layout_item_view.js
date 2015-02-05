'use strict';

/* global BaseView */

(function(exports) {

var LayoutItemView = function(list, layoutItem) {
  BaseView.apply(this);

  this._statusEl = null;
  this._progressEl = null;

  if (typeof layoutItem !== 'object') {
    throw new Error('LayoutItemView: ' +
      'LayoutItemView does not create a LayoutItem for itself, ' +
      'please pass an approate instance as the model.');
  }

  this.list = list;
  this._model = layoutItem;
};

LayoutItemView.prototype = Object.create(BaseView.prototype);

LayoutItemView.prototype.oninlistchange = null;

LayoutItemView.prototype.inList = undefined;

LayoutItemView.prototype.IN_LIST_INSTALLED = 0;
LayoutItemView.prototype.IN_LIST_INSTALLABLE = 1;

LayoutItemView.prototype.TEMPLATE_ID = 'installable-keyboard-list-item';

LayoutItemView.prototype.start = function() {
  this._model.onerror = this._showError.bind(this);
  this._model.onprogress = this._updateProgress.bind(this);
  this._model.onstatechange = this._updateUI.bind(this);

  var template = document.getElementById(this.TEMPLATE_ID);
  var el = this.container =
    document.importNode(template.content, true).firstElementChild;
  el.querySelector('.label').textContent = this._model.name;
  el.addEventListener('click', this);

  this._statusEl = el.querySelector('.status');
  this._progressEl = el.querySelector('.progress');

  this._updateUI();
};

LayoutItemView.prototype._updateProgress = function() {
  var loadedSizeData = this._getHumanFileSize(this._model.downloadLoadedSize);
  var totalSizeData = this._getHumanFileSize(this._model.downloadTotalSize);
  this._progressEl.value = this._model.downloadLoadedSize;
  this._progressEl.max = this._model.downloadTotalSize;
  this._statusEl.dataset.l10nArgs =
    JSON.stringify({
      loadedSize: loadedSizeData.size,
      loadedSizeUnit: loadedSizeData.localizedUnit,
      totalSize: totalSizeData.size,
      totalSizeUnit: totalSizeData.localizedUnit
    });
};

LayoutItemView.prototype._updateUI = function() {
  var fileSizeData;
  var loadedSizeData;
  var totalSizeData;

  var item = this._model;

  switch (item.state) {
    case item.STATE_PRELOADED:
      this.container.dataset.enabledAction = 'none';
      this._statusEl.dataset.l10nId = 'preInstalledStatus';
      fileSizeData = this._getHumanFileSize(item.fileSize);
      this._statusEl.dataset.l10nArgs = JSON.stringify({
        size: fileSizeData.size,
        sizeUnit: fileSizeData.localizedUnit
      });
      this._progressEl.classList.add('hide');
      this._updateList(this.IN_LIST_INSTALLED);

      break;

    case item.STATE_INSTALLABLE:
      this.container.dataset.enabledAction = 'download';
      this._statusEl.dataset.l10nId = 'installableStatus';
      fileSizeData = this._getHumanFileSize(item.fileSize);
      this._statusEl.dataset.l10nArgs = JSON.stringify({
        size: fileSizeData.size,
        sizeUnit: fileSizeData.localizedUnit
      });
      this._progressEl.classList.add('hide');
      this._updateList(this.IN_LIST_INSTALLABLE);

      break;

    case item.STATE_INSTALLING_CANCELLABLE:
      this.container.dataset.enabledAction = 'cancel-download';
      this._statusEl.dataset.l10nId = 'downloadingStatus';
      loadedSizeData = this._getHumanFileSize(item.downloadLoadedSize);
      totalSizeData = this._getHumanFileSize(item.downloadTotalSize);
      this._statusEl.dataset.l10nArgs =
        JSON.stringify({
          loadedSize: loadedSizeData.size,
          loadedSizeUnit: loadedSizeData.localizedUnit,
          totalSize: totalSizeData.size,
          totalSizeUnit: totalSizeData.localizedUnit
        });
      this._progressEl.classList.remove('hide');
      this._progressEl.value = item.downloadLoadedSize;
      this._progressEl.max = item.downloadTotalSize;
      this._updateList(this.IN_LIST_INSTALLABLE);

      break;

    case item.STATE_INSTALLING:
      this.container.dataset.enabledAction = 'none';
      this._statusEl.dataset.l10nId = 'downloadingStatus';
      fileSizeData = this._getHumanFileSize(item.fileSize);
      this._statusEl.dataset.l10nArgs =
        JSON.stringify({
          loadedSize: fileSizeData.size,
          loadedSizeUnit: fileSizeData.localizedUnit,
          totalSize: fileSizeData.size,
          totalSizeUnit: fileSizeData.localizedUnit
        });
      this._progressEl.classList.remove('hide');
      this._progressEl.value = this._progressEl.max = item.fileSize;
      this._updateList(this.IN_LIST_INSTALLABLE);

      break;

    case item.STATE_INSTALLED:
      this.container.dataset.enabledAction = 'remove';
      this._statusEl.dataset.l10nId = 'installedStatus';
      fileSizeData = this._getHumanFileSize(item.fileSize);
      this._statusEl.dataset.l10nArgs = JSON.stringify({
        size: fileSizeData.size,
        sizeUnit: fileSizeData.localizedUnit
      });
      this._progressEl.classList.add('hide');
      this._updateList(this.IN_LIST_INSTALLED);

      break;

    case item.STATE_REMOVING:
      this.container.dataset.enabledAction = 'none';
      this._statusEl.dataset.l10nId = 'removingStatus';
      delete this._statusEl.dataset.l10nArgs;
      this._progressEl.classList.add('hide');
      this._updateList(this.IN_LIST_INSTALLED);

      break;
  }
};

LayoutItemView.prototype._showError = function(errorInfo) {
  switch (errorInfo.error) {
    case errorInfo.ERROR_DOWNLOADERROR:
      this.list.showDownloadErrorToast();
      break;

    case errorInfo.ERROR_INSTALLERROR:
      console.error('LayoutItemView: layout installation error.');
      break;

    case errorInfo.ERROR_REMOVEERROR:
      console.error('LayoutItemView: layout removal error.');
      break;

    default:
      console.error('LayoutItemView: undefined onerror call,', errorInfo);

      break;
  }
};

LayoutItemView.prototype.handleEvent = function(evt) {
  var el = evt.target;

  // This is intentionally kept at minimum. We do not check if the currect state
  // is applicable for certain action, nor we keep the returned promise and
  // react on it. UI updates are all tie to state updates,
  // and state updates only.
  var p;
  switch (el.dataset.action) {
    case 'download':
      p = this._model.install();

      break;

    case 'cancelDownload':
      p = this._model.cancelInstall();

      break;

    case 'remove':
      p = this.list.confirmRemoval(this, this._model.name);

      break;
  }

  if (p) {
    p.catch(function(e) {
      e && console.error(e);
    });
  }
};

LayoutItemView.prototype.confirmRemoveItem = function() {
  this._model.remove();
};

LayoutItemView.prototype.stop = function() {
  this._model.onprogress = null;
  this._model.onstatechange = null;

  this.container.removeEventListener('click', this);
  this.container = null;
};

LayoutItemView.prototype._updateList = function(newListState) {
  if (newListState === this.inList) {
    return;
  }

  if (typeof this.inList === 'undefined') {
    // First time set, don't trigger.
    this.inList = newListState;

    return;
  }

  this.inList = newListState;
  if (typeof this.oninlistchange === 'function') {
    this.oninlistchange();
  }
};

LayoutItemView.prototype._getHumanFileSize = function(sizeInNumber) {
  // XXX I actually don't know how not to use get() here.
  var _ = navigator.mozL10n.get;
  var sizeString = '';
  var localizedUnit = '';

  if (sizeInNumber > (1 << 30)) {
    sizeString = (sizeInNumber / (1 << 30)).toFixed(2);
    localizedUnit = _('byteUnit-GB');
  } else if (sizeInNumber > (1 << 20)) {
    sizeString = (sizeInNumber / (1 << 20)).toFixed(2);
    localizedUnit = _('byteUnit-MB');
  } else if (sizeInNumber > (1 << 10)) {
    sizeString = (sizeInNumber / (1 << 10)).toFixed(2);
    localizedUnit = _('byteUnit-KB');
  } else {
    sizeString = sizeInNumber.toFixed(2);
    localizedUnit = _('byteUnit-B');
  }

  // Remove the zeros after decimal point,
  // and the decimal point too if there isn't any thing left on the right side.
  sizeString = sizeString.replace(/\.?0*$/, '');

  return {
    size: sizeString,
    localizedUnit: localizedUnit
  };
};

exports.LayoutItemView = LayoutItemView;

}(window));
