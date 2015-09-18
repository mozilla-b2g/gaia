/**
 * Volume:
 *   - Volume is an Observable that wraps the platform DeviceStorage objects.
 *   - It has some observable properties: name, isExternal, externalIndex,
 *     isUnrecognised, availableState, volumeState, musicUsedSpace,
 *     picturesUsedSpace, videosUsedSpace, sdcardUsedSpace, volumeFreeSpace.
 * Volume only updates storage information and does not involve in any UI logic.
 *
 * EX:
 * {
 *   "music":{},
 *   "pictures":{},
 *   "videos":{},
 *   "sdcard":{}
 * }
 *
 * @module Volume
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];

  /**
   * @class Volume
   * @requires module:modules/mvvm/observable
   * @param {Object} storages
   * @return {Observable} observableVolume
   */
  var Volume = Module.create(
    function Volume(storages, isExternal, externalIndex) {
      this.super(Observable).call(this);

      this._storages = storages;
      this._name = storages.sdcard.storageName;
      this._isDefault = storages.sdcard.default;
      this._isExternal = isExternal;
      this._externalIndex = externalIndex;
      this._canBeFormatted = storages.sdcard.canBeFormatted;

      this.observe('availableState', this.updateStoragesSize.bind(this));
      this._getAvailableState();
      this._getStorageStatus();
      this._watchStorageChangeEvent();
      this._watchStorageStateChangeEvent();

      this._logLevel = Module.LOG_LEVEL.NONE;
  }).extend(Observable);

  Object.defineProperty(Volume.prototype, 'data', {
    get: function() {
      return this._storages;
    }
  });

  Object.defineProperty(Volume.prototype, 'name', {
    get: function() {
      return this._name;
    }
  });

  Object.defineProperty(Volume.prototype, 'isExternal', {
    get: function() {
      return this._isExternal; // this.data.sdcard.isExternal
    }
  });

  Object.defineProperty(Volume.prototype, 'externalIndex', {
    get: function() {
      return this._externalIndex;
    }
  });

  Object.defineProperty(Volume.prototype, 'canBeFormatted', {
    get: function() {
      return this._canBeFormatted;
    }
  });

  Observable.defineObservableProperty(Volume.prototype,
    'availableState', { // corresponding storage 'change' event
      readonly: true,
      value: ''
  });

  Observable.defineObservableProperty(Volume.prototype,
    'volumeState', { // corresponding storage 'storage-state-change' event
      readonly: true,
      value: ''
  });

  Observable.defineObservableProperty(Volume.prototype,
    'volumeFreeSpace', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(Volume.prototype,
    'musicUsedSpace', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(Volume.prototype,
    'picturesUsedSpace', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(Volume.prototype,
    'videosUsedSpace', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(Volume.prototype,
    'sdcardUsedSpace', {
      readonly: true,
      value: 0
  });

  Observable.defineObservableProperty(Volume.prototype,
    'isDefault', {
      readonly: true
  });

  Observable.defineObservableProperty(Volume.prototype,
    'isUnrecognised', {
      readonly: true,
      value: false
  });

  /**
   * Provide a function to update latest storages used space.
   * While the 'availableState' property is changed to be 'available',
   * volume module will get the used space for all storages immediately.
   *
   * @access public
   * @memberOf Volume
   */
  Volume.prototype.updateStoragesSize = function() {
    this.debug('updateStoragesSize(): this.availableState = ' +
               this.availableState);
    if (this.availableState !== 'available') {
      return; // Early return if the 'availableState' is not 'available'.
    }

    MEDIA_TYPE.forEach((type) => {
      // used space for each media type
      this.data[type].usedSpace().then((size) => {
        this.debug('updateStoragesSize(): usedSpace(): size = ' +
                   JSON.stringify(size));
        this['_' + type + 'UsedSpace'] = size;
      }, (reason) => {
        this.debug('updateStoragesSize(): usedSpace(): reason = ' + reason);
      });
    });
    // free space remaining for this volume
    this.data.sdcard.freeSpace().then((size) => {
      this.debug('updateStoragesSize(): freeSpace(): size = ' +
                 JSON.stringify(size));
      this._volumeFreeSpace = size;
    }, (reason) => {
      this.debug('updateStoragesSize(): freeSpace(): reason = ' + reason);
    });
  };

  /**
   * Init property 'availableState' via get storage available() API.
   *
   * @access private
   * @memberOf Volume
   */
  Volume.prototype._getAvailableState = function() {
    this._storages.sdcard.available().then((state) => {
      this.debug('_getAvailableState(): state = ' + state);
      this._availableState = state;
    }, (reason) => {
      this.debug('_getAvailableState(): get available failed, reason = ' +
                 reason);
    });
  };

  /**
   * Init property 'volumeState' via get storageStatus() API.
   *
   * @access private
   * @memberOf Volume
   */
  Volume.prototype._getStorageStatus = function() {
    this._storages.sdcard.storageStatus().then((state) => {
      this.debug('_getStorageStatus(): state = ' + state);
      this._volumeState = state;
    }, (reason) => {
      this.debug('_getStorageStatus(): get storageStatus() failed: reason = ' +
                 reason + ', reset to "Mount-Fail"');
      this._volumeState = 'Mount-Fail';
    });
  };

  /**
   * Watch storage 'change' event from the volume.
   * While the storage fires 'change' event, the volume module have to update
   * latest 'isDefault' and 'availableState'.
   *
   * @access private
   * @memberOf Volume
   */
  Volume.prototype._watchStorageChangeEvent = function() {
    this._storages.sdcard.addEventListener('change', (evt) => {
      this.debug('storage "change": evt.reason = ' + evt.reason);
      // update 'isDefault' property
      if (evt.reason === 'became-default-location') {
        this._isDefault = true;
      }

      if (evt.reason === 'default-location-changed') {
        this._isDefault = false;
      }

      // update 'availableState' property
      if (evt.reason === ('available' || 'unavailable' || 'shared')) {
        this._availableState = evt.reason;
      } else {
        this._getAvailableState();
      }
    });
  };

  /**
   * Watch storage 'storage-state-change' event from the volume.
   * While the storage fires 'storage-state-change' event, the volume module
   * have to update latest volume state.
   * The event reason will be as following volume state.
   * 'Init', 'NoMedia', 'Pending', 'Unmounting', 'Shared', 'Shared-Mounted',
   * 'Formatting', 'Checking', 'Idle', 'Mounted', and 'Mount-Fail'.
   *
   * @access private
   * @memberOf Volume
   */
  Volume.prototype._watchStorageStateChangeEvent = function() {
    this._storages.sdcard.addEventListener('storage-state-change', (evt) => {
      this.debug('storage "storage-state-change": evt.reason = ' + evt.reason);
      this._volumeState = evt.reason;
    });
  };

  return Volume;
});
