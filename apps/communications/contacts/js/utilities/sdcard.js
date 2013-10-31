'use strict';

var utils = window.utils || {};

if (!utils.sdcard) {
  var SdCard = utils.sdcard = {
    NOT_INITIALIZED: 0,
    NOT_AVAILABLE: 1,
    AVAILABLE: 2,
    observers: {}
  };

  SdCard.status = SdCard.NOT_INITIALIZED;
  SdCard.deviceStorage = navigator.getDeviceStorage('sdcard');

  SdCard.updateStorageState = function sd_updateStorageState(state) {
    switch (state) {
      case 'available':
        SdCard.status = SdCard.AVAILABLE;
        break;
      // Making the 'shared' state as NOT_AVAILABLE since we
      // could have inconsistencies if we allow changing the sdcard
      // content meanwhile exporting/importing
      case 'shared':
      case 'unavailable':
      case 'deleted':
        SdCard.status = SdCard.NOT_AVAILABLE;
        break;
    }
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

  /**
   * Retrieves files that adjust to the kind specified in the
   * parameters from the SD card inserted in the device.
   *
   * @param {String[]} mimes Possible mime types of the files to be found.
   * @param {String[]} exts Possible file extensions of the files to be found.
   * @param {Function} cb Callback.
   */
  SdCard.retrieveFiles = function retrieveFilesContent(mimes, exts, cb) {
    var storage = navigator.getDeviceStorage('sdcard');
    var fileArray = [];

    var cursor = storage.enumerate();
    cursor.onsuccess = function(e) {
      var file = e.target.result;
      if (!file) {
        cb(null, fileArray);
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

    cursor.onerror = function() {
      cb(this.error.name);
    };
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
    if (!fileArray || !fileArray.length)
      return cb && cb(null, contents);

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
