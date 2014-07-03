/* global SettingsListener */
/**
 * MediaStorage is a singleton that caches default media storage values for
 * media storage and root panel fast access
 */
define(function(require) {
  'use strict';

  var Observable = require('modules/mvvm/observable');

  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];

  var DefaultMediaStorage = function() {
    this._enabled = false;
    this._defaultMediaVolumeKey = 'device.storage.writable.name';
    // this._appStorage = navigator.getDeviceStorage('apps');
    // name: { types }
    this.storage = Observable({
      music: 0,
      pictures: 0,
      videos: 0,
      sdcard: 0,
      free: 0
    });

    this._boundMediaVolumeChangeHandler =
      this._mediaVolumeChangeHandler.bind(this);
  };

  DefaultMediaStorage.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the app storage.
     *
     * @access public
     * @memberOf SDCard.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      // early return if the value is not changed
      if (this._enabled === value) {
        return;
      } else {
        this._enabled = value;
      }
      if (value) {
        this._attachListeners();
        this._updateMediaStorageInfo();
      } else {
        this._detachListeners();
      }
    },

    _attachListeners: function as_attachListeners() {
      // this._appStorage.addEventListener('change', this);
      SettingsListener.observe(this._defaultMediaVolumeKey, 'sdcard',
          this._boundMediaVolumeChangeHandler);
    },

    _detachListeners: function as_detachListeners() {
      // this._appStorage.removeEventListener('change', this);
      SettingsListener.unobserve(this._defaultMediaVolumeKey,
          this._boundMediaVolumeChangeHandler);
    },

    handleEvent: function as_handler(evt) {
      switch (evt.type) {
        case 'change':
          this._updateMediaStorageInfo();
          break;
      }
    },

    _updateMediaStorageInfo: function ms_updateMediaStorageInfo() {
      // var current = MEDIA_TYPE.length;
      var volumes = {};

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

      /*
      var self = this;
      for (var name in volumes) {
        MEDIA_TYPE.forEach(function(type) {
          var storage = volumes[name][type];
          storage.usedSpace().onsuccess = function(e) {
            self.storage[type] = e.target.result;
            current--;
            if (current === 0) {
              storage.freeSpace().onsuccess = function(e) {
                self.storage.free = e.target.result;
              };
            }
          };
        });
      }
      */
    },

    _mediaVolumeChangeHandler:
      function ms_mediaVolumeChangeHandler(defaultName) {
      if (this._defaultMediaVolume) {
        this._defaultMediaVolume.removeEventListener('change', this);
      }
      this._defaultMediaVolume = this._getDefaultVolume(defaultName);
      this._defaultMediaVolume.addEventListener('change', this);
      this._updateMediaStorageInfo();
    },

    // util function
    _getDefaultVolume: function ms_getDefaultVolume(name) {
      // Per API design, all media type return the same volumes.
      // So we use 'sdcard' here for no reason.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=856782#c10
      var volumes = navigator.getDeviceStorages('sdcard');
      if (!name || name === '') {
        return volumes[0];
      }
      for (var i = 0; i < volumes.length; ++i) {
        if (volumes[i].storageName === name) {
          return volumes[i];
        }
      }
      return volumes[0];
    }
  };

  // return singleton
  var instance = new DefaultMediaStorage();
  instance.enabled = true;
  return instance;
});
