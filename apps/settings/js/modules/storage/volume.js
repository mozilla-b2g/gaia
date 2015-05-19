/**
 * Volume:
 *   - Volume is an Observable that wraps the platform DeviceStorage objects.
 *   - It has some observable properties: name, isExternal, externalIndex,
 *     isUnrecognised, availableState, volumeState, musicUsedSpace,
 *     picturesUsedSpace, videosUsedSpace, sdcardUsedSpace, volumeFreeSpace.
 * Volume only updates storage information and does not involve in any UI logic.
 *
 * @module Volume
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');

  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function ms_debug(msg) {
      console.log('--> [Volume]: ' + msg);
    };
  }

  /**
   * Provide a function to update latest storages used space.
   * While the 'availableState' property is changed to be 'available',
   * volume module will get the used space for all storages immediately.
   *
   * @access public
   * @memberOf Volume
   * @param {Object} evt
   */
  var updateStoragesSize = function() {
    Debug('updateStoragesSize(): this.availableState = ' + this.availableState);
    if (this.availableState !== 'available') {
      return; // Early return if the 'availableState' is not 'available'.
    }

    MEDIA_TYPE.forEach((type) => {
      // used space for each media type
      this.data[type].usedSpace().then((size) => {
        Debug('updateStoragesSize(): usedSpace(): size = ' +
              JSON.stringify(size));
        this[type + 'UsedSpace'] = size;
      }, (reason) => {
        Debug('updateStoragesSize(): usedSpace(): reason = ' + reason);
      });
    });
    // free space remaining for this volume
    this.data.sdcard.freeSpace().then((size) => {
      Debug('updateStoragesSize(): freeSpace(): size = ' +
            JSON.stringify(size));
      this.volumeFreeSpace = size;
    }, (reason) => {
      Debug('updateStoragesSize(): freeSpace(): reason = ' + reason);
    });
  };

  /**
   * @class Volume
   * @requires module:modules/mvvm/observable
   * @param {Array} storages
   * @return {Observable} observableVolume
   */
  return function ctor_volume(storages, isExternal, externalIndex) {
    var observableVolume = Observable({
      // use sdcard storage to represent this volume
      name: storages.sdcard.storageName,
      isDefault: storages.sdcard.default,
      isExternal: storages.sdcard.isExternal,
      externalIndex: externalIndex,
      isUnrecognised: false,
      availableState: '', // corresponding storage 'change' event
      volumeState: '', // corresponding storage 'storage-state-change' event
      musicUsedSpace: 0,
      picturesUsedSpace: 0,
      videosUsedSpace: 0,
      sdcardUsedSpace: 0,
      volumeFreeSpace: 0,
      get data() {return storages;},
      updateStoragesSize: updateStoragesSize
    });

    /**
     * Observe 'availableState' property changed event in init function.
     * Once the property changed, we can update corrected value and description
     * for the volume.
     */
    observableVolume._init = function v__init() {
      this.observe('availableState', this.updateStoragesSize.bind(this));
      this._getAvailableState();
      this._getStorageStatus();
    };

    // Init property 'availableState' via get storage available() API.
    observableVolume._getAvailableState = function v__getAvailableState() {
      storages.sdcard.available().then((state) => {
        Debug('_getAvailableState(): state = ' + state);
        this.availableState = state;
      }, (reason) => {
        Debug('_getAvailableState(): get available failed, reason = ' + reason);
      });
    };

    // Init property 'volumeState' via get storageStatus() API.
    observableVolume._getStorageStatus = function v__getStorageStatus() {
      storages.sdcard.storageStatus().then((state) => {
        Debug('_getStorageStatus(): state = ' + state);
        this.volumeState = state;
      }, (reason) => {
        Debug('_getStorageStatus(): get storageStatus() failed: reason = ' +
              reason + ', reset to "Mount-Fail"');
        this.volumeState = 'Mount-Fail';
      });
    };

    // Watch storage 'change' event from the volume.
    // While the storage fires 'change' event, the volume module have to update
    // latest 'isDefault' and 'availableState'.
    storages.sdcard.addEventListener('change', (evt) => {
      Debug('storage "change": evt.reason = ' + evt.reason);
      // update 'isDefault' property
      if (evt.reason === 'became-default-location') {
        observableVolume.isDefault = true;
      }

      if (evt.reason === 'default-location-changed') {
        observableVolume.isDefault = false;
      }

      // update 'availableState' property
      if (evt.reason === ('available' || 'unavailable' || 'shared')) {
        observableVolume.availableState = evt.reason;
      } else {
        observableVolume._getAvailableState();
      }
    });

    // Watch storage 'storage-state-change' event from the volume.
    // While the storage fires 'storage-state-change' event, the volume module
    // have to update latest volume state.
    // The event reason will be as following volume state.
    // 'Init', 'NoMedia', 'Pending', 'Unmounting', 'Shared', 'Shared-Mounted',
    // 'Formatting', 'Checking', 'Idle', 'Mounted', and 'Mount-Fail'.
    storages.sdcard.addEventListener('storage-state-change', (evt) => {
      Debug('storage "storage-state-change": evt.reason = ' + evt.reason);
      observableVolume.volumeState = evt.reason;
    });

    observableVolume._init();
    return observableVolume;
  };
});
