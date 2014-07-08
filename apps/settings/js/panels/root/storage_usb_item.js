/* global DeviceStorageHelper */
/**
 * Links the root panel list item with USB Storage.
 *
 * XXX bug 973451 will remove media storage part
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var AsyncStorage = require('shared/async_storage');

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
    this._umsSettingKey = 'ums.enabled';
    // XXX media related attributes
    this._defaultMediaVolume = null;
    this._defaultVolumeState = 'available';
    this._defaultMediaVolumeKey = 'device.storage.writable.name';
    this._boundUmsSettingHandler = this._umsSettingHandler.bind(this);
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
        // ums master switch on root panel
        this._elements.umsEnabledCheckBox.addEventListener('change', this);

        SettingsListener.observe(this._umsSettingKey, false,
          this._boundUmsSettingHandler);

        // media storage
        // Show default media volume state on root panel
        SettingsListener.observe(this._defaultMediaVolumeKey, 'sdcard',
          this._boundMediaVolumeChangeHandler);
        window.addEventListener('localized', this);
      } else { //unobserve
        this._elements.umsEnabledCheckBox.removeEventListener('change', this);

        SettingsListener.unobserve(this._umsSettingKey,
          this._boundUmsSettingHandler);

        // media storage
        SettingsListener.unobserve(this._defaultMediaVolumeKey,
          this._boundMediaVolumeChangeHandler);
        window.removeEventListener('localized', this);
      }
    },

    _umsSettingHandler: function storage_umsSettingHandler(enabled) {
      this._elements.umsEnabledCheckBox.checked = enabled;
      this._updateUmsDesc();
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateMediaStorageInfo();
          break;
        case 'change':
          if (evt.target === this._elements.umsEnabledCheckBox) {
            this._umsMasterSettingChanged(evt);
          } else {
            // we are handling storage state changes
            // possible state: available, unavailable, shared
            this._updateMediaStorageInfo();
          }
          break;
      }
    },

    // ums description
    _updateUmsDesc: function storage_updateUmsDesc() {
      var localize = navigator.mozL10n.localize;
      var key;
      if (this._elements.umsEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this._defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      localize(this._elements.umsEnabledInfoBlock, key);
    },

    _umsMasterSettingChanged: function storage_umsMasterSettingChanged(evt) {
      var checkbox = evt.target;
      var cset = {};
      var warningKey = 'ums-turn-on-warning';

      if (checkbox.checked) {
        AsyncStorage.getItem(warningKey, function(showed) {
          if (!showed) {
            this._elements.umsWarningDialog.hidden = false;

            this._elements.umsConfirmButton.onclick = function() {
              cset[this._umsSettingKey] = true;
              Settings.mozSettings.createLock().set(cset);

              AsyncStorage.setItem(warningKey, true);
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);

            this._elements.umsCancelButton.onclick = function() {
              cset[this._umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);
          } else {
            cset[this._umsSettingKey] = true;
            Settings.mozSettings.createLock().set(cset);
          }
        }.bind(this));
      } else {
        cset[this._umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    // XXX media related functions
    _mediaVolumeChangeHandler:
      function storage_mediaVolumeChangeHandler(defaultName) {
      if (this._defaultMediaVolume) {
        this._defaultMediaVolume.removeEventListener('change', this);
      }
      this._defaultMediaVolume = this._getDefaultVolume(defaultName);
      this._defaultMediaVolume.addEventListener('change', this);
      this._updateMediaStorageInfo();
    },

    // Media Storage
    _updateMediaStorageInfo: function storage_updateMediaStorageInfo() {
      if (!this._defaultMediaVolume) {
        return;
      }

      var self = this;
      this._defaultMediaVolume.available().onsuccess = function(evt) {
        var state = evt.target.result;
        var firstVolume = navigator.getDeviceStorages('sdcard')[0];
        // if the default storage is unavailable, and it's not the
        // internal storage, we show the internal storage status instead.
        if (state === 'unavailable' &&
          self._defaultMediaVolume.storageName !== firstVolume.storageName) {
          firstVolume.available().onsuccess = function(e) {
            self._updateVolumeState(firstVolume, e.target.result);
          };
        } else {
          self._updateVolumeState(self._defaultMediaVolume, state);
        }
      };
    },

    _updateVolumeState: function storage_updateVolumeState(volume, state) {
      var localize = navigator.mozL10n.localize;
      this._defaultVolumeState = state;
      this._updateUmsDesc();
      switch (state) {
        case 'available':
          this._updateMediaFreeSpace(volume);
          this._lockMediaStorageMenu(false);
          break;

        case 'shared':
          localize(this._elements.mediaStorageDesc, '');
          this._lockMediaStorageMenu(false);
          break;

        case 'unavailable':
          localize(this._elements.mediaStorageDesc, 'no-storage');
          this._lockMediaStorageMenu(true);
          break;
      }
    },

    _updateMediaFreeSpace: function storage_updateMediaFreeSpace(volume) {
      var self = this;
      volume.freeSpace().onsuccess = function(e) {
        DeviceStorageHelper.showFormatedSize(self._elements.mediaStorageDesc,
          'availableSize', e.target.result);
      };
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
