'use strict';

/* global PromiseStorage */

(function(exports) {

var InputMethodDatabaseConfig = function() {
  // The _configPromise always resolves to the config JSON or null, in which
  // null indicates the JSON does not present.
  this._configPromise = null;
};

InputMethodDatabaseConfig.prototype.CONFIG_FILE_PATH =
  './js/settings/layouts.json';

InputMethodDatabaseConfig.prototype.start = function() {
  this._getConfig();
};

InputMethodDatabaseConfig.prototype.stop = function() {
  this._configPromise = null;
};

InputMethodDatabaseConfig.prototype.isDataPreloaded =
function(imEngineName, dataPath) {
  return this._configPromise.then(function(layouts) {
    if (!layouts) {
      // If there is no config file, that means we are run directly in the
      // source tree and everything is "preloaded".
      return true;
    }

    var layout = layouts.find(function(layout) {
      return (layout.dictFilePath === dataPath &&
              layout.imEngineId === imEngineName);
    });

    if (!layout) {
      console.warn('InputMethodDatabaseConfig: ' +
        'Ask for isDataPreloaded for data unlisted in config',
        'imEngineName=', imEngineName,
        'dataPath=', dataPath);

      return true;
    }

    return layout.preloaded;
  });
};

InputMethodDatabaseConfig.prototype.isAllDataPreloaded = function() {
  return this._configPromise.then(function(layouts) {
    if (!layouts) {
      // If there is no config file, that means we are run directly in the
      // source tree and everything is "preloaded".
      return true;
    }

    return layouts.every(function(layout) {
      return layout.preloaded;
    });
  });
};

InputMethodDatabaseConfig.prototype._getConfig = function() {
  this._configPromise = new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.CONFIG_FILE_PATH);
    xhr.responseType = 'json';
    xhr.onload = function() {
      if (xhr.response) {
        resolve(xhr.response);
      } else {
        resolve(null);
      }
    };
    xhr.onerror = function() {
      reject();
    };
    xhr.send();
  }.bind(this)).catch(function(e) {
    e && console.error(e);

    return null;
  });
};

/**
 * InputMethodDatabaseLoader provide a uniform interface for the IMEngine to
 * get it's data (as arraybuffer). It currently supports getting the data from
 * package only but eventually we would like to get the dynamic downloaded data
 * from IndexedDB as well.
 */
var InputMethodDatabaseLoader = function InputMethodDatabaseLoader() {
  this.config = null;

  this._loadDBStorePromise = null;
  this.dbStore = null;
};

InputMethodDatabaseLoader.prototype.DATABASE_NAME = 'imEngineData';

InputMethodDatabaseLoader.prototype.SOURCE_DIR = './js/imes/';

InputMethodDatabaseLoader.prototype.start = function() {
  this.config = new InputMethodDatabaseConfig();
  this.config.start();

  // We should not open the IndexedDB if the config tell us there isn't
  // any data to be expected there.
  this._loadDBStorePromise =
    this.config.isAllDataPreloaded()
    .then(function(allDataPreloaded) {
      if (allDataPreloaded) {
        return;
      }

      this.dbStore = new PromiseStorage(this.DATABASE_NAME);
      this.dbStore.start();
    }.bind(this)).catch(function(e) {
      e && console.error(e);
    });
};

InputMethodDatabaseLoader.prototype.stop = function() {
  this.config.stop();
  this.config = null;

  return this._loadDBStorePromise.then(function() {
    if (this.dbStore) {
      this.dbStore.stop();
      this.dbStore = null;
    }

    this._loadDBStorePromise = null;
  }.bind(this));
};

InputMethodDatabaseLoader.prototype.load = function(imEngineName, dataPath) {
  var p = this.config.isDataPreloaded(imEngineName, dataPath)
    .then(function(isDataPreloaded) {
      if (isDataPreloaded) {
        var url = this.SOURCE_DIR + imEngineName + '/' + dataPath;
        return this._loadPreloadData(url);
      } else {
        var databaseId = imEngineName + '/' + dataPath;
        return this._loadDBStoreData(databaseId);
      }
    }.bind(this))
    .catch(function(e) {
      e && console.error('InputMethodDatabaseLoader: Failed to load data.',
        'imEngineName=', imEngineName,
        'dataPath=', dataPath,
        'error=', e);

      throw e;
    });

  return p;
};

InputMethodDatabaseLoader.prototype._loadPreloadData = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
      if (xhr.status !== 404 &&
          xhr.response &&
          xhr.response.byteLength) {
        resolve(xhr.response);
      } else {
        reject(xhr.statusText);
      }
    };

    xhr.send();
  }.bind(this));
};

InputMethodDatabaseLoader.prototype._loadDBStoreData = function(databaseId) {
  return this._loadDBStorePromise.then(function() {
    if (!this.dbStore) {
      console.error('InputMethodDatabaseLoader:' +
        'Asked to load data from IndexedDB but build config indicates' +
        ' otherwise.');

      throw undefined;
    }

    return this.dbStore.getItem(databaseId);
  }.bind(this));
};

exports.InputMethodDatabaseConfig = InputMethodDatabaseConfig;
exports.InputMethodDatabaseLoader = InputMethodDatabaseLoader;

})(window);
