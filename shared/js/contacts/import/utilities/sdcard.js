'use strict';

var utils = window.utils || {};

if (!utils.sdcard) {
  var SdCard = utils.sdcard = {
    NOT_INITIALIZED: 0,
    NOT_AVAILABLE: 1,
    AVAILABLE: 2,
    SHARED: 3,
    observers: {}
  };

  SdCard.status = SdCard.NOT_INITIALIZED;
  SdCard.deviceStorages = navigator.getDeviceStorages('sdcard');
  SdCard.deviceStorage = Array.isArray(SdCard.deviceStorages) &&
                                                      SdCard.deviceStorages[0];

  SdCard._toStatus = function toStatus(state) {
    switch (state) {
      case 'available':
        SdCard.status = SdCard.AVAILABLE;
        break;
      // NOTE: The 'SHARED' state is equivalent to NOT_AVAILABLE, since we
      // could have inconsistencies if we allow changing the sdcard content
      // meanwhile exporting/importing.
      // It's needed to have it's own state solely for showing the proper
      // message when needed
      case 'shared':
        SdCard.status = SdCard.SHARED;
        break;
      case 'unavailable':
      case 'deleted':
        SdCard.status = SdCard.NOT_AVAILABLE;
        break;
    }
  };

  SdCard.updateStorageState = function sd_updateStorageState(state) {
    SdCard._toStatus(state);

    Object.keys(this.observers).forEach(function onObserver(name) {
      if (typeof(SdCard.observers[name]) === 'function') {
        SdCard.observers[name].call(null, state);
      }
    });
  };

  if (SdCard.deviceStorage) {
    SdCard.deviceStorage
      .addEventListener('change', function sd_deviceStorageChangeHandler(e) {
        SdCard.updateStorageState(e.reason);
      });

    if (SdCard.status === SdCard.NOT_INITIALIZED) {
      SdCard.deviceStorage.available().onsuccess = (function(e) {
        SdCard.updateStorageState(e.target.result);
      });
    }
  }

  /**
   * Check whether there is a SD card inserted in the device.
   * @return {Boolean} true if sdcard available, false otherwise.
   */
  SdCard.checkStorageCard = function sd_checkStorageCard() {
    return SdCard.status === SdCard.AVAILABLE;
  };

  SdCard.getStatus = function(cb) {
    if (!SdCard.deviceStorage) {
      SdCard._toStatus('unavailable');
      cb(SdCard.status);
      return;
    }

    var req = SdCard.deviceStorage.available();

    req.onsuccess = function() {
      SdCard._toStatus(req.result);
      cb(SdCard.status);
    };
    req.onerror = function() {
      console.error('Error while determining SD Status', req.error.name);
      cb(SdCard.status);
    };
  };

  /**
   * Retrieves files that adjust to the kind specified in the
   * parameters from the SD card inserted in the device.
   *
   * @param {String[]} mimes Possible mime types of the files to be found.
   * @param {String[]} exts Possible file extensions of the files to be found.
   * @param {Function} cb Callback.
   */
  SdCard.retrieveFiles = function retrieveFilesContent(mimes, exts, cb) {
    var fileArray = [];

    // getDeviceStorages('sdcard') can return more than one storage unit
    // in different order, depends on the default media storage setting,
    // so we need to iterate though them to be sure we checked the proper
    // SD Card
    var storages = navigator.getDeviceStorages('sdcard');
    var numberOfStorages = storages.length;
    var currentStorage = 0;

    var cursorOnError = function() {
      cb(this.error.name);
    };

    var cursorOnSuccess = function(e) {
      var file = e.target.result;
      // If we don't have any more files on the storage...
      if (!file) {
        // ... but we have more storages...
        if (++currentStorage < numberOfStorages) {
          // ... check the next one
          cursor = storages[currentStorage].enumerate();
          cursor.onsuccess = cursorOnSuccess;
          cursor.onerror = cursorOnError;
        } else {
          cb(null, fileArray);
        }
      } else {
        if ((mimes.indexOf(file.type) === -1) &&
          file.name.search(new RegExp('.(' + exts.join('|') + ')$')) === -1) {
          cursor.continue();
        } else {
          fileArray.push(file);
          cursor.continue();
        }
      }
    };

    var cursor = storages[currentStorage].enumerate();
    cursor.onsuccess = cursorOnSuccess;
    cursor.onerror = cursorOnError;
  };

  /**
   * Extracts and concatenates text from the given array of file objects.
   *
   * @param {Array} fileArray Array of File Objects.
   * @param {String} contents Accumulated text from the previous recursive call.
   * @param {Function} cb Function to call when the work is finished.
   */
  SdCard.getTextFromFiles = function(fileArray, contents, cb) {
    contents = contents || '';
    if (!fileArray || !fileArray.length) {
      return cb && cb(null, contents);
    }

    var reader = new FileReader();
    reader.onload = function onloaded() {
      contents += reader.result + '\n';
      SdCard.getTextFromFiles(fileArray, contents, cb);
    };

    try {
      reader.readAsText(fileArray.shift());
    }
    catch (ex) {
      window.console.error('Problem reading file: ', ex.stack);
      SdCard.getTextFromFiles(fileArray, contents, cb);
    }
  };

  // Subscribe a callback for sdcard changes. A name is needed
  // to refer to this observer.
  // @param {String} identifier for the observer
  // @param {Function} the callback to be invoqued on a change
  // @param {Boolean} if the callback exists, override it
  SdCard.subscribeToChanges = function(name, func, force) {
    if (this.observers[name] !== undefined && !force) {
      return false;
    }

    this.observers[name] = func;
    return true;
  };

  // Remove the subscription to listen to changes for the specific
  // identifier
  // @param {String} the identifier
  SdCard.unsubscribeToChanges = function(name) {
    if (this.observers[name]) {
      delete this.observers[name];
      return true;
    } else {
      return false;
    }
  };
}
