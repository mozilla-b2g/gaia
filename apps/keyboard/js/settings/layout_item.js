'use strict';

(function(exports) {

var LayoutItemErrorInfo = function(layoutItemState) {
  switch (layoutItemState) {
    case LayoutItem.prototype.STATE_INSTALLING_CANCELLABLE:
      this.error = this.ERROR_DOWNLOADERROR;
      break;

    case LayoutItem.prototype.STATE_INSTALLING:
      this.error = this.ERROR_INSTALLERROR;
      break;

    case LayoutItem.prototype.STATE_REMOVING:
      this.error = this.ERROR_REMOVEERROR;
      break;

    default:
      throw new Error('LayoutItemErrorInfo: Error at invalid state.');
  }
};
LayoutItemErrorInfo.prototype.ERROR_DOWNLOADERROR = 1;
LayoutItemErrorInfo.prototype.ERROR_INSTALLERROR = 2;
LayoutItemErrorInfo.prototype.ERROR_REMOVEERROR = 3;

var LayoutItem = function(list, layout) {
  this.list = list;

  this.id = layout.id;
  this.name = layout.name;
  this.imEngineId = layout.imEngineId;
  this.dictFilePath = layout.dictFilePath;
  this.fileSize = layout.dictFileSize;

  this.types = layout.types;

  // Set the initial state.
  if (layout.preloaded) {
    this.state = this.STATE_PRELOADED;
  } else if (layout.installed) {
    this.state = this.STATE_INSTALLED;
  } else {
    this.state = this.STATE_INSTALLABLE;
  }

  this._dictionary = null;
  this._userCancelled = undefined;
};

LayoutItem.prototype.STATE_PRELOADED = 1;
LayoutItem.prototype.STATE_INSTALLABLE = 2;
LayoutItem.prototype.STATE_INSTALLING_CANCELLABLE = 3;
LayoutItem.prototype.STATE_INSTALLING = 4;
LayoutItem.prototype.STATE_INSTALLED = 5;
LayoutItem.prototype.STATE_REMOVING = 6;

LayoutItem.prototype.onerror = null;
LayoutItem.prototype.onstatechange = null;
LayoutItem.prototype.onprogress = null;

LayoutItem.prototype.id = '';
LayoutItem.prototype.name = '';
LayoutItem.prototype.types = null;
LayoutItem.prototype.fileSize = 0;
LayoutItem.prototype.downloadLoadedSize = 0;
LayoutItem.prototype.downloadTotalSize = 0;

LayoutItem.prototype.start = function() {
  if (this.state !== this.STATE_PRELOADED) {
    this._dictionary = this.list.dictionaryList
      .getDictionary(this.imEngineId, this.dictFilePath);
  }
};

LayoutItem.prototype.stop = function() {
  // noop
};

LayoutItem.prototype.install = function() {
  if (this.state !== this.STATE_INSTALLABLE) {
    throw new Error('LayoutItem: ' +
      'Can\'t install a layout under this state.');
  }

  var openLock = this.list.closeLockManager.requestLock('stayAwake');

  this._userCancelled = false;

  var p = Promise.resolve()
    .then(function() {
      var p = this._dictionary.installForLayout(this);

      if (this._dictionary.state ===
          this._dictionary.STATE_INSTALLING_CANCELLABLE) {
        this.downloadLoadedSize = this._dictionary.downloadLoadedSize;
        this.downloadTotalSize = this._dictionary.downloadTotalSize;
        this._changeState(this.STATE_INSTALLING_CANCELLABLE);
      } else {
        this._changeState(this.STATE_INSTALLING);
      }

      // Resolve until the dictionary is in the installed state.
      return p;
    }.bind(this))
    .then(function() {
      if (this.state !== this.STATE_INSTALLING) {
        this.downloadLoadedSize = 0;
        this.downloadTotalSize = 0;

        this._changeState(this.STATE_INSTALLING);
      }

      return navigator.mozInputMethod.addInput(this.id, {
        launch_path: '/index.html#' + this.id,
        name: this.name,
        description: this.name,
        types: this.types
      });
    }.bind(this))
    .then(this.list.setLayoutAsInstalled.bind(this.list, this.id))
    .then(function() {
      this._userCancelled = undefined;
      openLock.unlock();
      this._changeState(this.STATE_INSTALLED);
    }.bind(this))
    .catch(function(e) {
      if (!this._userCancelled) {
        this._triggerError();
      }

      this._userCancelled = undefined;
      this.downloadLoadedSize = 0;
      this.downloadTotalSize = 0;

      openLock.unlock();
      this._changeState(this.STATE_INSTALLABLE);

      throw (e || new Error('LayoutItem: Installation failed/cancelled.'));
    }.bind(this));

  return p;
};

LayoutItem.prototype.cancelInstall = function() {
  if (this.state !== this.STATE_INSTALLING_CANCELLABLE) {
    throw new Error('LayoutItem: ' +
      'Can\'t cancel an install under this state.');
  }

  this._userCancelled = true;
  this._dictionary.removeForLayout(this);
};

LayoutItem.prototype.remove = function() {
  if (this.state !== this.STATE_INSTALLED) {
    throw new Error('LayoutItem: ' +
      'Can\'t remove a layout under this state.');
  }

  var openLock = this.list.closeLockManager.requestLock('stayAwake');

  var p = Promise.resolve()
    .then(function() {
      this._changeState(this.STATE_REMOVING);
      return navigator.mozInputMethod.removeInput(this.id);
    }.bind(this))
    .then(function() {
      return this.list.setLayoutAsUninstalled(this.id)
        .catch(function(e) {
          // This is not good; we'd de-registered globally but failed to
          // de-register internally ourselves.
          // There isn't an obvious way to fix this, other than ignoring the
          // error and hope the user can fix the inconsistency by complete
          // another install-remove cycle.
          console.error(
            'LayoutItem: Ignoring set uninstall failure.', e);
        });
    }.bind(this))
    .then(function() {
      return this._dictionary.removeForLayout(this)
        .catch(function(e) {
          // Ignore failed removal and still mark the layout as removed here,
          // since we have already de-registered at this point.
          console.error(
            'LayoutItem: Ignoring dictionary removal failure.', e);
        });
    }.bind(this))
    .then(openLock.unlock.bind(openLock))
    .then(this._changeState.bind(this, this.STATE_INSTALLABLE))
    .catch(function(e) {
      this._triggerError();
      openLock.unlock();
      this._changeState(this.STATE_INSTALLED);

      throw (e || new Error('LayoutItem: Removing failed.'));
    }.bind(this));

  return p;
};

// Will be called by LayoutDictionary during the downloading process.
LayoutItem.prototype.updateInstallProgress = function(loaded, total) {
  if (this.state !== this.STATE_INSTALLING_CANCELLABLE) {
    console.warn(
      'LayoutItem: Ignoring updateInstallProgress call in the wrong state.');

    return;
  }

  this.downloadLoadedSize = loaded;
  this.downloadTotalSize = total;

  if (typeof this.onprogress === 'function') {
    return this.onprogress(loaded, total);
  }
};

LayoutItem.prototype._triggerError = function() {
  if (typeof this.onerror === 'function') {
    this.onerror(new LayoutItemErrorInfo(this.state));
  }
};

LayoutItem.prototype._changeState = function(state) {
  this.state = state;

  if (typeof this.onstatechange === 'function') {
    return this.onstatechange();
  }
};

exports.LayoutItemErrorInfo = LayoutItemErrorInfo;
exports.LayoutItem = LayoutItem;

}(window));
