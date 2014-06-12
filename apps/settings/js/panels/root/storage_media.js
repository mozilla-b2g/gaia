/* global DeviceStorageHelper */
/**
 * Links the root panel list item with MediaStorage.
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  function MediaStoragePanel() {
    this._elements = null;
    this._enabled = false;
    this.defaultMediaVolume = null;
    this.defaultVolumeState = 'available';
  }

  MediaStoragePanel.prototype = {
    init: function media_storage_init(elements) {
      this._elements = elements;
    },
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      this._enabled = value;
      var defaultMediaVolumeKey = 'device.storage.writable.name';

      if (value) { //observe
        // media storage
        // Show default media volume state on root panel
        SettingsListener.observe(defaultMediaVolumeKey, 'sdcard',
          this._mediaVolumeChangeHandler.bind(this));
        window.addEventListener('localized', this);
      } else { //unobserve
        // media storage
        SettingsListener.unobserve(defaultMediaVolumeKey,
          this._mediaVolumeChangeHandler.bind(this));
        window.removeEventListener('localized', this);
      }
    },

    _mediaVolumeChangeHandler:
      function storage__mediaVolumeChangeHandler(defaultName) {
      if (this.defaultMediaVolume) {
        this.defaultMediaVolume.removeEventListener('change', this);
      }
      this.defaultMediaVolume = this.getDefaultVolume(defaultName);
      this.defaultMediaVolume.addEventListener('change', this);
      this.updateMediaStorageInfo();
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this.updateMediaStorageInfo();
          break;
        case 'change':
          if (evt.target !== this._elements.umsEnabledCheckBox) {
            // we are handling storage state changes
            // possible state: available, unavailable, shared
            this.updateMediaStorageInfo();
          }
          break;
      }
    },

    // Media Storage
    updateMediaStorageInfo: function storage_updateMediaStorageInfo() {
      if (!this.defaultMediaVolume) {
        return;
      }

      var self = this;
      this.defaultMediaVolume.available().onsuccess = function(evt) {
        var state = evt.target.result;
        var firstVolume = navigator.getDeviceStorages('sdcard')[0];
        // if the default storage is unavailable, and it's not the
        // internal storage, we show the internal storage status instead.
        if (state === 'unavailable' &&
            self.defaultMediaVolume.storageName !== firstVolume.storageName) {
          firstVolume.available().onsuccess = function(e) {
            self.updateVolumeState(firstVolume, e.target.result);
          };
        } else {
          self.updateVolumeState(self.defaultMediaVolume, state);
        }
      };
    },

    updateVolumeState: function storage_updateVolumeState(volume, state) {
      var localize = navigator.mozL10n.localize;
      this.defaultVolumeState = state;
      this.updateUmsDesc();
      switch (state) {
        case 'available':
          this.updateMediaFreeSpace(volume);
          this.lockMediaStorageMenu(false);
          break;

        case 'shared':
          localize(this._elements.mediaStorageDesc, '');
          this.lockMediaStorageMenu(false);
          break;

        case 'unavailable':
          localize(this._elements.mediaStorageDesc, 'no-storage');
          this.lockMediaStorageMenu(true);
          break;
      }
    },

    updateMediaFreeSpace: function storage_updateMediaFreeSpace(volume) {
      var self = this;
      volume.freeSpace().onsuccess = function(e) {
        DeviceStorageHelper.showFormatedSize(self._elements.mediaStorageDesc,
          'availableSize', e.target.result);
      };
    },

    lockMediaStorageMenu: function storage_setMediaMenuState(lock) {
      if (lock) {
        this._elements.mediaStorageSection.setAttribute('aria-disabled', true);
      } else {
        this._elements.mediaStorageSection.removeAttribute('aria-disabled');
      }
    },

    // util function
    getDefaultVolume: function storage_getDefaultVolume(name) {
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

  return function ctor_media_storage_panel() {
    return new MediaStoragePanel();
  };
});
