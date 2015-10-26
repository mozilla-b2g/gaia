define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var SettingsListener = require('shared/settings_listener');

  /**
   * @class MediaVolume
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @returns {MediaVolume}
   */
  var MediaStorage = Module.create(function MediaStorage() {
    this.super(Observable).call(this);

    this._defaultMediaVolume = null;
    this._defaultMediaVolumeKey = 'device.storage.writable.name';

    // Monitor default media volume state
    SettingsListener.observe(this._defaultMediaVolumeKey, 'sdcard',
      this._mediaVolumeChangeHandler.bind(this));
  }).extend(Observable);

  Observable.defineObservableProperty(MediaStorage.prototype,
    'volumeState', {
      readonly: true,
      value: 'available'
  });

  Observable.defineObservableProperty(MediaStorage.prototype,
    'freeSize', {
      readonly: true,
      value: 0
  });

  MediaStorage.prototype.handleEvent = function ms_handler(evt) {
    switch (evt.type) {
      case 'change':
        // we are handling storage state changes
        // possible state: available, unavailable, shared
        this._updateMediaStorageInfo();
        break;
    }
  };

  MediaStorage.prototype._mediaVolumeChangeHandler =
    function ms__mediaVolumeChangeHandler(defaultName) {
    if (this._defaultMediaVolume) {
      this._defaultMediaVolume.removeEventListener('change', this);
    }
    this._defaultMediaVolume = this._getDefaultVolume(defaultName);
    if (this._defaultMediaVolume) {
      this._defaultMediaVolume.addEventListener('change', this);
    }
    this._updateMediaStorageInfo();
  };

  // Media Storage
  MediaStorage.prototype._updateMediaStorageInfo =
    function ms__updateMediaStorageInfo() {
    if (!this._defaultMediaVolume) {
      this._updateVolumeState(null, 'unavailable');
      return;
    }

    var req = this._defaultMediaVolume.available();
    req.onsuccess = evt => {
      var state = evt.target.result;
      var firstVolume = navigator.getDeviceStorages('sdcard')[0];
      // if the default storage is unavailable, and it's not the
      // internal storage, we show the internal storage status instead.
      if (state === 'unavailable' &&
        this._defaultMediaVolume.storageName !== firstVolume.storageName) {
        firstVolume.available().onsuccess = e => {
          this._updateVolumeState(firstVolume, e.target.result);
        };
      } else {
        this._updateVolumeState(this._defaultMediaVolume, state);
      }
    };
  };

  MediaStorage.prototype._updateVolumeState =
    function ms__updateVolumeState(volume, state) {
    this._volumeState = state;

    volume.freeSpace().onsuccess = (e) => {
      this._freeSize = e.target.result;
    };
  };

  // util function
  MediaStorage.prototype._getDefaultVolume =
    function ms__getDefaultVolume(name) {
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
  };

  return MediaStorage();
});
