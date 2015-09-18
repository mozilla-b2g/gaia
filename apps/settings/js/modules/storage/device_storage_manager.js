/**
 * DeviceStorageManager:
 *   - DeviceStorageManager is an Observable that wraps the platform
 *     DeviceStorage object.
 *   - DeviceStorageManager is a singleton that you can easily use it to fetch
 *     some shared data across different panels.
 *   - It has some observable properties: todo: state, enabled, address, name,
 *   - It has one observable array: _volumesList.
 * DeviceStorageManager only update state and does not involve in any UI logic.
 *
 * @module DeviceStorageManager
 */
define(function(require) {
  'use strict';

  var Volume = require('modules/storage/volume');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');

  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];
  const FIRST_VOLUME_NAME = 'sdcard';

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function ds_debug(msg) {
      console.log('--> [DeviceStorageManager]: ' + msg);
    };
  }

  var DeviceStorageManager = {
    /**
     * An observable array to maintain device storages which are gotten from 
     * navigator.getDeviceStorages() API.
     *
     * @access private
     * @memberOf DeviceStorageManager
     * @type {ObservableArray}
     */
    _volumesList: ObservableArray([]),

    /**
     * The default media volume used for outter UI reference.
     *
     * @readonly
     * @memberOf DeviceStorageManager
     * @type {Object}
     */
    defaultVolume: null,

    /**
     * Init DeviceStorageManager module.
     *
     * @access private
     * @memberOf DeviceStorageManager
     */
    _init: function dsm__init() {
      // construct volumes list
      this._constructVolumesList();
      // construct default volume
      this._constructDefaultVolume();
      this._watchDefaultVolume();
    },

    /**
     * The method will construct volumes list with all storages.
     *
     * @access private
     * @memberOf DeviceStorageManager
     */
    _constructVolumesList: function dsm__constructVolumesList() {
      var volumes = this._getVolumes();
      var externalIndex = 0;
      for (var name in volumes) {
        console.log('_constructVolumesList(): name = ' + name);
        // create observable storages
        var observableVolume;
        // XXX: This is a heuristic to determine whether a storage is internal
        // or external (e.g. a pluggable SD card). It does *not* work
        // in general, but it works for all officially-supported devices.
        // Reference MDN:
        // Accessing different storage areas with navigator.getDeviceStorages():
        if (volumes.length > 1 && name === 'sdcard') {
          console.log('_constructVolumesList(): internal..');
          observableVolume = Volume(volumes[name], false /* internal */, 0);
        } else {
          console.log('_constructVolumesList(): external..');
          observableVolume = Volume(volumes[name], true /* external */,
                                    externalIndex++);
        }
        // push volume storage in volumes list with observable object
        // console.log('_constructVolumesList(): observableVolume = ' +
        //             JSON.stringify(observableVolume));
        this._volumesList.push(observableVolume);
      }
      Debug('_constructVolumesList(): this._volumesList = ' +
            JSON.stringify(this._volumesList));
    },

    /**
     * The method will save all accessing instances of storage type in object
     * per volume. The storage name of storages are the same in one volume.
     * Then, return the volumes object.
     *
     * @access private
     * @memberOf DeviceStorageManager
     * @returns {Obejct} volumes
     */
    _getVolumes: function dsm__init() {
      var volumes = {};
      // Save storages instances per type:
      // 'music', 'pictures', 'videos', 'sdcard'.
      MEDIA_TYPE.forEach(function(type) {
        var storages = navigator.getDeviceStorages(type);
        storages.forEach(function(storage) {
          var name = storage.storageName;
          if (!volumes.hasOwnProperty(name)) {
            volumes[name] = {};
          }
          volumes[name][type] = storage;
        });
      });
      Debug('_getVolumes(): volumes = ' + JSON.stringify(volumes));
      return volumes;
    },

    /**
     * The method will construct default volume.
     *
     * @access private
     * @memberOf DeviceStorageManager
     */
    _constructDefaultVolume: function dsm__constructDefaultVolume() {
      var volumesList = this.getVolumesList();
      volumesList.array.forEach((volume) => {
        if (volume.isDefault) {
          this.defaultVolume = volume;
        }
      });
    },    

    /**
     * The method will watch the 'isDefault' property from each volume.
     *
     * @access private
     * @memberOf DeviceStorageManager
     */
    _watchDefaultVolume: function dsm__watchDefaultVolume() {
      var volumesList = this.getVolumesList();
      volumesList.array.forEach((volume) => {
        volume.observe('isDefault',
                       this._updateDefaultVolume.bind(this, volume));
      });
    },

    /**
     * The method will update default volume while each volume property is
     * changed.
     *
     * @access private
     * @memberOf DeviceStorageManager
     * @param {Object Volume} volume
     * @param {Boolean} newIsDefault
     */
    _updateDefaultVolume:
    function dsm__updateDefaultVolume(volume, newIsDefault) {
      if (newIsDefault) {
        Debug('_updateDefaultVolume(): default volume changed');
        this.defaultVolume = volume;  
      }
    },

    /**
     * Return volumes list which is maintained in DeviceStorageManager module.
     *
     * @access public
     * @memberOf DeviceStorageManager
     * @return {Observable Array}
     */
    getVolumesList: function dsm_getVolumesList() {
      return this._volumesList;
    },

    /**
     * Return first volume which is maintained in DeviceStorageManager module.
     *
     * @access public
     * @memberOf DeviceStorageManager
     * @return {Observable Array}
     */
    getFirstVolume: function dsm_getFirstVolume() {
      var volumes = this.getVolumesList();
      for (var index in volumes.array) {
        if (volumes.array[index].name === FIRST_VOLUME_NAME) {
          return volumes.get(index);
        }
      }
    }
  };

  // Create the observable object using the prototype.
  var deviceStorageManager = Observable(DeviceStorageManager);
  deviceStorageManager._init();
  return deviceStorageManager;
});
