/* global DeviceStorageHelper */
/**
 * Links the root panel list item with USB Storage.
 *
 * XXX bug 973451 will remove media storage part
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  /**
   * @alias module:panels/root/storage_usb_item
   * @class USBStorageItem
   * @param {Object} elements
                     elements displaying the usb and media storage information
   * @returns {USBStorageItem}
   */
  function USBStorageItem(elements) {
    this._enabled = false;
    this._elements = elements;
    this._keyUmsEnabled = 'ums.enabled';
    // XXX media related attributes
    this._defaultMediaVolume = null;
    this._defaultVolumeState = 'available';
    this._defaultMediaVolumeKey = 'device.storage.writable.name';

    this._boundUmsEnabledHandler = this._umsEnabledHandler.bind(this);
    this._boundMediaVolumeChangeHandler =
      this._mediaVolumeChangeHandler.bind(this);
  }

  USBStorageItem.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @memberOf USBStorageItem.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      if (this._enabled === value) {
        return;
      } else {
        this._enabled = value;
      }
      if (value) { //observe
        SettingsListener.observe(this._keyUmsEnabled, false,
          this._boundUmsEnabledHandler);

        // media storage
        // Show default media volume state on root panel
        SettingsListener.observe(this._defaultMediaVolumeKey, 'sdcard',
          this._boundMediaVolumeChangeHandler);
        window.addEventListener('localized', this);
      } else { //unobserve
        SettingsListener.unobserve(this._keyUmsEnabled,
          this._boundUmsEnabledHandler);

        // media storage
        SettingsListener.unobserve(this._defaultMediaVolumeKey,
          this._boundMediaVolumeChangeHandler);
        window.removeEventListener('localized', this);
      }
    },

    _umsEnabledHandler: function storage_umsEnabledHandler(enabled) {
      this._enabled = enabled;
      this._updateUmsDesc();
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateMediaStorageInfo();
          break;
        case 'change':
          // we are handling storage state changes
          // possible state: available, unavailable, shared
          this._updateMediaStorageInfo();
          break;
      }
    },

    // ums description
    _updateUmsDesc: function storage_updateUmsDesc() {
      var key;
      if (this._enabled) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this._defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      this._elements.usbEnabledInfoBlock.setAttribute('data-l10n-id', key);
    },

    // XXX media related functions
    _mediaVolumeChangeHandler:
      function storage_mediaVolumeChangeHandler(defaultName) {
      if (this._defaultMediaVolume) {
        this._defaultMediaVolume.removeEventListener('change', this);
      }
      this._defaultMediaVolume = this._getDefaultVolume(defaultName);
      if (this._defaultMediaVolume) {
        this._defaultMediaVolume.addEventListener('change', this);
      }
      this._updateMediaStorageInfo();
    },

    // Media Storage
    _updateMediaStorageInfo: function storage_updateMediaStorageInfo() {
      if (!this._defaultMediaVolume) {
        this._updateVolumeState(null, 'unavailable');
        return;
      }

      var availbleMediaVolume = this._defaultMediaVolume.available();
      availbleMediaVolume.onsuccess = (evt) => {
        var state = evt.target.result;
        var firstVolume = navigator.getDeviceStorages('sdcard')[0];
        // if the default storage is unavailable, and it's not the
        // internal storage, we show the internal storage status instead.
        if (state === 'unavailable' &&
          this._defaultMediaVolume.storageName !== firstVolume.storageName) {
          firstVolume.available().onsuccess = (e) => {
            this._updateVolumeState(firstVolume, e.target.result);
          };
        } else {
          this._updateVolumeState(this._defaultMediaVolume, state);
        }
      };
      availbleMediaVolume.onerror = function() {
        console.log('Error fail to get media volume');
      };
    },

    _updateVolumeState: function storage_updateVolumeState(volume, state) {
      this._defaultVolumeState = state;
      this._updateUmsDesc();
      switch (state) {
        case 'available':
          this._updateMediaFreeSpace(volume);
          this._lockMediaStorageMenu(false);
          break;

        case 'shared':
          this._elements.mediaStorageDesc.removeAttribute('data-l10n-id');
          this._elements.mediaStorageDesc.textContent = '';
          this._lockMediaStorageMenu(false);
          break;

        case 'unavailable':
          this._elements.mediaStorageDesc.setAttribute('data-l10n-id',
                                                       'no-storage');
          this._lockMediaStorageMenu(true);
          break;
      }
    },

    _updateMediaFreeSpace: function storage_updateMediaFreeSpace(volume) {
      volume.freeSpace().onsuccess = e =>
        DeviceStorageHelper.showFormatedSize(this._elements.mediaStorageDesc,
          'availableSize', e.target.result);
    },

    _lockMediaStorageMenu: function storage_setMediaMenuState(lock) {
      if (lock) {
        this._elements.mediaStorageSection.setAttribute('aria-disabled', true);
      } else {
        this._elements.mediaStorageSection.removeAttribute('aria-disabled');
      }
    },

    // util function
    _getDefaultVolume: function storage_getDefaultVolume(name) {
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

  return function ctor_usb_storage_item(elements) {
    return new USBStorageItem(elements);
  };
});
