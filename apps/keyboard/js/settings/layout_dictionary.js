'use strict';

/* global LayoutDictionaryDownloader */

(function(exports) {

var Deferred = function() {
  this.promise = new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }.bind(this));

  return this;
};

var LayoutDictionary = function(list, dict) {
  this.dbStore = list.dbStore;

  this.imEngineId = dict.imEngineId;
  this.filename = dict.filename;
  this.filePath = dict.filePath;
  this.fileSize = dict.fileSize;
  this.databaseId = dict.databaseId;
  this.installedLayoutIds = dict.installedLayoutIds;

  // Set the initial state.
  if (dict.preloaded) {
    // Layout is preloaded so the dictionary is preloaded, i.e. can be found
    // in the packaged app.
    this.state = this.STATE_PRELOADED;
  } else if (this.installedLayoutIds.size !== 0) {
    // Set the dict as installed since one of the layouts is installed.
    this.state = this.STATE_INSTALLED;
  } else {
    // Note that this simply means none of the layouts is installed, so
    // we consider the dictionay is not installed, i.e. present in the database.
    // However, it's possible the remove action last time had failed so
    // there is a unlinked data in the database.
    // We can make sure of that by actually look up the database but let's not
    // spend battery power doing that.
    this.state = this.STATE_INSTALLABLE;
  }

  this._downloader = null;

  // This property holds a Map that contains LayoutItem instances as key and
  // Deferred instances as values.
  // They represents the LayoutItem instances we should notify our progress
  // against, also the layouts we should mark as installed when the
  // installation is complete.
  this._installingLayoutDeferreds = null;

  // This property holds the installing promise when it's in progress.
  this._installingPromise = null;

  // This property holds the removing promise when it's in progress.
  this._removingPromise = null;
};

LayoutDictionary.prototype.state = 0;

LayoutDictionary.prototype.imEngineId = '';
LayoutDictionary.prototype.filename = '';
LayoutDictionary.prototype.filePath = '';
LayoutDictionary.prototype.fileSize = 0;
LayoutDictionary.prototype.databaseId = 0;
LayoutDictionary.prototype.installedLayoutIds = null;

LayoutDictionary.prototype.downloadLoadedSize = 0;
LayoutDictionary.prototype.downloadTotalSize = 0;

LayoutDictionary.prototype.STATE_PRELOADED = 1;
LayoutDictionary.prototype.STATE_INSTALLABLE = 2;
LayoutDictionary.prototype.STATE_INSTALLING_CANCELLABLE = 3;
LayoutDictionary.prototype.STATE_INSTALLING = 4;
LayoutDictionary.prototype.STATE_INSTALLED = 5;
LayoutDictionary.prototype.STATE_REMOVING = 6;

LayoutDictionary.prototype.start = function() {
  this._installingLayoutDeferreds = new Map();
};

LayoutDictionary.prototype.stop = function() {
  this._downloader = null;
  this._installingLayoutDeferreds = null;
  this._installingPromise = null;
  this._removingPromise = null;
};

// Request to install a given layout for the layoutItem.
// Return a promise that would resolve when the installation is completed.
LayoutDictionary.prototype.installForLayout = function(layoutItem) {
  var deferred;

  switch (this.state) {
    case this.STATE_PRELOADED:
      throw new Error('LayoutDictionary: ' +
        'Can\'t install a dictionary under this state.');

    case this.STATE_INSTALLABLE:
      // This starts the install process and throw us to
      // STATE_INSTALLING_CANCELLABLE state.
      this._startInstall();

      deferred = new Deferred();
      this._installingLayoutDeferreds.set(layoutItem, deferred);

      return deferred.promise;

    case this.STATE_INSTALLING_CANCELLABLE:
    case this.STATE_INSTALLING:
      if (this._installingLayoutDeferreds.has(layoutItem)) {
        return this._installingLayoutDeferreds.get(layoutItem).promise;
      }

      deferred = new Deferred();
      this._installingLayoutDeferreds.set(layoutItem, deferred);

      return deferred.promise;

    case this.STATE_INSTALLED:
      this.installedLayoutIds.add(layoutItem.id);

      return Promise.resolve();

    case this.STATE_REMOVING:
      // We are essentially asking for re-install after removing here,
      // since removing is not cancellable.
      //
      // Let's wait for the removingPromise to resolve,
      // and re-run ourselves in the STATE_INSTALLED or STATE_INSTALLABLE state.
      return this._removingPromise
        .then(this.installForLayout.bind(this, layoutItem),
          this.installForLayout.bind(this, layoutItem));

    default:
      throw new Error('LayoutDictionary: Invalid state.');
  }
};

LayoutDictionary.prototype.removeForLayout = function(layoutItem) {
  switch (this.state) {
    case this.STATE_PRELOADED:
      throw new Error('LayoutDictionary: ' +
        'Can\'t remove a dictionary under this state.');

    case this.STATE_INSTALLABLE:
      // Do nothing here -- dictionary is not installed so the layout
      // must have not installed.
      return Promise.resolve();

    case this.STATE_INSTALLING_CANCELLABLE:
      // If we are not the layout being installed, quietly resolves.
      if (!this._installingLayoutDeferreds.has(layoutItem)) {
        return Promise.resolve();
      }

      var deferred = this._installingLayoutDeferreds.get(layoutItem);
      deferred.reject('Cancelled');

      this._installingLayoutDeferreds.delete(layoutItem);

      // Quietly resolves since there are other layouts.
      if (this._installingLayoutDeferreds.size > 0) {
        return deferred.promise.catch(function() { });
      }

      // Cancel the download since there no layout to install
      this._downloader.abort();

      // Return a always resolve promise chain after installingPromise
      // since the layout is not installed anyway but we must resolve after
      // state change.
      return this._installingPromise
        .catch(function() { });

    case this.STATE_INSTALLING:
      // If we are not the layout being installed, quietly resolves.
      if (!this._installingLayoutDeferreds.has(layoutItem)) {
        return Promise.resolve();
      }

      deferred = this._installingLayoutDeferreds.get(layoutItem);
      deferred.reject('Cancelled');

      this._installingLayoutDeferreds.delete(layoutItem);

      // Quietly resolves since there are other layouts.
      if (this._installingLayoutDeferreds.size > 0) {
        return deferred.promise.catch(function() { });
      }

      // Return a always resolve promise chain after installingPromise
      // since the layout is not installed anyway but we must resolve after
      // state change.
      // The dictionary will be removed after installation.
      return this._installingPromise
        .catch(function() { });

    case this.STATE_INSTALLED:
      if (!this.installedLayoutIds.has(layoutItem.id)) {
        // Layout is not installed. Quietly resolve.
        return Promise.resolve();
      }

      if (this.installedLayoutIds.size > 1) {
        // Don't actually remove the dictionary since other layouts need it.

        // Remove ourselves from the list.
        this.installedLayoutIds.delete(layoutItem.id);

        return Promise.resolve();
      }

      // This starts the removal process and throw us to
      // STATE_REMOVING state.
      this._startRemove();

      this._removingPromise = this._removingPromise
        .then(function() {
          this.installedLayoutIds.delete(layoutItem.id);
        }.bind(this));

      return this._removingPromise;

    case this.STATE_REMOVING:
      if (this.installedLayoutIds.has(layoutItem.id)) {
        // We are removing the dictionary for this layout.
        // Simply return the removingPromise.
        return this._removingPromise;
      }

      // Layout is not installed. Quietly resolve.
      return Promise.resolve();

    default:
      throw new Error('LayoutDictionary: Invalid state.');
  }
};

LayoutDictionary.prototype._startInstall = function() {
  if (this.state !== this.STATE_INSTALLABLE) {
    throw new Error('LayoutDictionary: ' +
          'Can\'t start install a dictionary under this state.');
  }

  this.state = this.STATE_INSTALLING_CANCELLABLE;

  this.downloadLoadedSize = 0;
  // XXX The download total size might not be the file size.
  this.downloadTotalSize = this.fileSize;

  this._downloader =
    new LayoutDictionaryDownloader(this.imEngineId, this.filename);
  this._downloader.onprogress = this._updateProgress.bind(this);

  this._installingPromise = this._downloader.load()
    .then(function(data) {
      this._downloader = null;
      this.state = this.STATE_INSTALLING;
      return this.dbStore.setItem(this.databaseId, data);
    }.bind(this))
    .then(function() {
      this._installingPromise = null;
      this._installingLayoutDeferreds
        .forEach(function(deferred, layoutItem) {
          this.installedLayoutIds.add(layoutItem.id);
          deferred.resolve();
        }, this);
      this._installingLayoutDeferreds.clear();
      this.state = this.STATE_INSTALLED;
      this.downloadLoadedSize = 0;
      this.downloadTotalSize = 0;
    }.bind(this))
    .catch(function(e) {
      console.warn('LayoutDictionary: Installation failed with error:', e);

      this._downloader = null;
      this._installingPromise = null;
      this._installingLayoutDeferreds
        .forEach(function(deferred) {
          deferred.reject('Failed');
        }, this);
      this._installingLayoutDeferreds.clear();
      this.state = this.STATE_INSTALLABLE;
      this.downloadLoadedSize = 0;
      this.downloadTotalSize = 0;
    }.bind(this))
    .then(function() {
      // This happens when all layout installation is cancelled but
      // dictionary is continued being installed.
      // We should remove ourselves now.
      if (this.state === this.STATE_INSTALLED &&
          this._installingLayoutDeferreds.size === 0 &&
          this.installedLayoutIds.size === 0) {
        return this._startRemove();
      }
    }.bind(this));
};

LayoutDictionary.prototype._startRemove = function() {
  if (this.state !== this.STATE_INSTALLED) {
    throw new Error('LayoutDictionary: ' +
      'Can\'t start remove a dictionary under this state.');
  }

  this.state = this.STATE_REMOVING;

  this._removingPromise = this.dbStore.deleteItem(this.databaseId)
    .then(function() {
      this._removingPromise = null;
      this.state = this.STATE_INSTALLABLE;
    }.bind(this))
    .catch(function(e) {
      this._removingPromise = null;
      this.state = this.STATE_INSTALLED;

      throw e;
    }.bind(this));
};

LayoutDictionary.prototype._updateProgress = function(loaded, total) {
  this.downloadLoadedSize = loaded;
  this.downloadTotalSize = total;

  Array.from(this._installingLayoutDeferreds)
    .map(function(keyValue) { return keyValue[0]; })
    .forEach(function(layoutItem) {
      layoutItem.updateInstallProgress(loaded, total);
    });
};

exports.LayoutDictionary = LayoutDictionary;

}(window));
