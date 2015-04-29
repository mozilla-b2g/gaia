/**
 * Links the root panel list item with USB Storage.
 *
 * XXX bug 973451 will remove media storage part
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var AsyncStorage = require('shared/async_storage');
  var SettingsUtils = require('modules/settings_utils');
  var SettingsCache = require('modules/settings_cache');
  var SettingsService = require('modules/settings_service');

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
        this._elements.usbEnabledCheckBox.disabled = false;
        // ums master switch on root panel
        this._elements.usbEnabledCheckBox.addEventListener('change', this);

        SettingsListener.observe(this._umsSettingKey, false,
          this._boundUmsSettingHandler);

        // media storage
        // Show default media volume state on root panel
        SettingsListener.observe(this._defaultMediaVolumeKey, 'sdcard',
          this._boundMediaVolumeChangeHandler);
        window.addEventListener('localized', this);

        // register USB storage split click handler
        this._elements.usbStorage.addEventListener('click', this._onItemClick);
      } else { //unobserve
        this._elements.usbEnabledCheckBox.removeEventListener('change', this);

        SettingsListener.unobserve(this._umsSettingKey,
          this._boundUmsSettingHandler);

        // media storage
        SettingsListener.unobserve(this._defaultMediaVolumeKey,
          this._boundMediaVolumeChangeHandler);
        window.removeEventListener('localized', this);

        this._elements.usbStorage.removeEventListener('click',
          this._onItemClick);
      }
    },

    _umsSettingHandler: function storage_umsSettingHandler(enabled) {
      this._elements.usbEnabledCheckBox.checked = enabled;
      this._updateUmsDesc();
    },

    // navigate to USB Storage panel
    _onItemClick: function storage_onItemClick(evt) {
      SettingsService.navigate('usbStorage');
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this._updateMediaStorageInfo();
          break;
        case 'change':
          if (evt.target === this._elements.usbEnabledCheckBox) {
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
      var key;
      if (this._elements.usbEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this._defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      this._elements.usbEnabledInfoBlock.setAttribute('data-l10n-id', key);
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
              AsyncStorage.setItem(warningKey, true);
              this._elements.umsWarningDialog.hidden = true;

              SettingsCache.getSettings(
                this._openIncompatibleSettingsDialogIfNeeded.bind(this));
            }.bind(this);

            this._elements.umsCancelButton.onclick = function() {
              cset[this._umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);
          } else {
            SettingsCache.getSettings(
              this._openIncompatibleSettingsDialogIfNeeded.bind(this));
          }
        }.bind(this));
      } else {
        cset[this._umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    _openIncompatibleSettingsDialogIfNeeded:
      function storage_openIncompatibleSettingsDialogIfNeeded(settings) {
        var cset = {};
        var umsSettingKey = this._umsSettingKey;
        var usbTetheringSetting = settings['tethering.usb.enabled'];

        if (!usbTetheringSetting) {
          cset[umsSettingKey] = true;
          Settings.mozSettings.createLock().set(cset);
        } else {
          var oldSetting = 'tethering.usb.enabled';
          SettingsUtils.openIncompatibleSettingsDialog(
            'incompatible-settings-warning',
            umsSettingKey, oldSetting, null
          );
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
      var self = this;
      volume.freeSpace().onsuccess = function(e) {
        SettingsUtils.DeviceStorageHelper.showFormatedSize(
          self._elements.mediaStorageDesc, 'availableSize', e.target.result);
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
