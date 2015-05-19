/**
 * DefaultMediaVolume:
 *   - DefaultMediaVolume is an Observable that wraps the platform
 *     DeviceStorage object.
 *   - DefaultMediaVolume is a singleton that you can easily use it to fetch
 *     some shared data across different panels.
 *   - It has some observable properties: currentVolume.
 * DefaultMediaVolume only update state and does not involve in any UI logic.
 *
 * @module DefaultMediaVolume
 */
define(function(require) {
  'use strict';

  var DeviceStorages = require('modules/storage/device_storages');
  var Observable = require('modules/mvvm/observable');

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function dmv_debug(msg) {
      console.log('--> [DefaultMediaVolume]: ' + msg);
    };
  }

  var DefaultMediaVolume = {
    /**
     * The default media volume used for outter UI reference.
     *
     * @readonly
     * @memberOf DefaultMediaVolume
     * @type {Object}
     */
    currentVolume: null,

    /**
     * Init DefaultMediaVolume module.
     *
     * @access private
     * @memberOf DefaultMediaVolume
     */
    _init: function dmv__init() {
      // construct default media volume
      this._constructDefaultMediaVolume();
      this._watchDefaultMediaVolume();
    },

    /**
     * The method will construct default media volume from DeviceStorages module
     *
     * @access private
     * @memberOf DefaultMediaVolume
     */
    _constructDefaultMediaVolume: function dmv__constructDefaultMediaVolume() {
      var volumesList = DeviceStorages.getVolumesList();
      volumesList.array.forEach((volume) => {
        if (volume.isDefault) {
          this.currentVolume = volume;
        }
      });
    },    

    /**
     * The method will watch the 'isDefault' property from each volume.
     *
     * @access private
     * @memberOf DefaultMediaVolume
     */
    _watchDefaultMediaVolume: function dmv__watchDefaultMediaVolume() {
      var volumesList = DeviceStorages.getVolumesList();
      volumesList.array.forEach((volume) => {
        volume.observe('isDefault',
                       this._updateDefaultMediaStorage.bind(this, volume));
      });
    },

    /**
     * The method will update default media storage while each volume property
     * is changed.
     *
     * @access private
     * @memberOf DefaultMediaVolume
     * @param {Object Volume} volume
     * @param {Boolean} newIsDefault
     */
    _updateDefaultMediaStorage:
    function dmv__updateDefaultMediaStorage(volume, newIsDefault) {
      if (newIsDefault) {
        Debug('_updateDefaultMediaStorage(): defaultMediaVolume changed');
        this.currentVolume = volume;  
      }
    }
  };

  // Create the observable object using the prototype.
  var defaultMediaVolume = Observable(DefaultMediaVolume);
  defaultMediaVolume._init();
  return defaultMediaVolume;
});
