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
    var forbiddenDirectories = ['.Trash'];

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

    // RegExp that checks if a string contains any of the extensions.
    var reExt = new RegExp('.(' + exts.join('|') + ')$');

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
        if ((mimes.indexOf(file.type) === -1) && !reExt.test(file.name)) {
          cursor.continue();
        } else {
          if (forbiddenDirectories.indexOf(file.name) === -1) {
            fileArray.push(file);
            cursor.continue();
          }
        }
      }
    };

    var cursor = storages[currentStorage].enumerate();
    cursor.onsuccess = cursorOnSuccess;
    cursor.onerror = cursorOnError;
  };

  /**
   * Incrementally extracts vcard text from a file.
   *
   * @param {Object} file File Object.
   * @param {Function} cb Function to call for each chunk of vcards retrieved
   *                      from the file.
   */
  SdCard.getTextFromFile = function(file, cb) {
    if (!file) {
      return Promise.reject();
    }
    return new Promise((resolve, reject) => {
      const END_VCARD = 'end:vcard';
      const CHUNK_SIZE = 1 * 1024 * 1024; // 1Mb

      var fileReader = new FileReader();

      var result = 0;

      (function readChunk(offset, buffer) {
        if (offset >= file.size) {
          resolve(result);
          return;
        }
        var chunk = file.slice(offset, offset + CHUNK_SIZE);
        offset += CHUNK_SIZE;
        fileReader.readAsText(chunk);
        fileReader.onload = function() {
          buffer += fileReader.result;
          if (!buffer.match(/end:vcard/gi)) {
            readChunk(offset, buffer);
            return;
          }
          var lastContactInChunk =
            buffer.toLowerCase().lastIndexOf(END_VCARD) + END_VCARD.length;
          cb(buffer.substr(0, lastContactInChunk)).then(partialResult => {
            result += partialResult;
            readChunk(offset, buffer.substr(lastContactInChunk + 1));
          }).catch(error => {
            console.warn(error);
          });
        };
      })(0 /* initial offset */, '' /* initial empty buffer */);
    });
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
