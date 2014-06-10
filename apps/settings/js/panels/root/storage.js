/* global DeviceStorageHelper */
/**
 * Links the root panel list item with AppStorage.
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var AsyncStorage = require('shared/async_storage');
  var AppStorage = require('modules/app_storage');

  function Storage() {
    this._elements = null;
  }

  Storage.prototype = {
    appStorage: null,
    defaultMediaVolume: null,
    defaultVolumeState: 'available',

    init: function storage_init(elements) {
      var self = this;
      this._elements = elements;

      // ums master switch on root panel
      this._elements.umsEnabledCheckBox.addEventListener('change', this);
      var umsSettingKey = 'ums.enabled';
      SettingsListener.observe(umsSettingKey, false, function(enabled) {
        self._elements.umsEnabledCheckBox.checked = enabled;
        self.updateUmsDesc();
      });

      // app storage
      AppStorage.storage.observe('freeSize',
        this.updateAppFreeSpace.bind(this));
      this.updateAppFreeSpace();

      // media storage
      // Show default media volume state on root panel
      var defaultMediaVolumeKey = 'device.storage.writable.name';
      SettingsListener.observe(defaultMediaVolumeKey, 'sdcard',
        function onDefaultMediaVolumeChange(defaultName) {
          if (self.defaultMediaVolume) {
            self.defaultMediaVolume.removeEventListener('change', self);
          }
          self.defaultMediaVolume = self.getDefaultVolume(defaultName);
          self.defaultMediaVolume.addEventListener('change', self);
          self.updateMediaStorageInfo();
      });

      window.addEventListener('localized', this);
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this.updateAppFreeSpace();
          this.updateMediaStorageInfo();
          break;
        case 'change':
          if (evt.target === this._elements.umsEnabledCheckBox) {
            this.umsMasterSettingChanged(evt);
          } else {
            // we are handling storage state changes
            // possible state: available, unavailable, shared
            this.updateMediaStorageInfo();
          }
          break;
      }
    },

    // ums description
    updateUmsDesc: function storage_updateUmsDesc() {
      var localize = navigator.mozL10n.localize;
      var key;
      if (this._elements.umsEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this.defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      localize(this._elements.umsEnabledInfoBlock, key);
    },

    umsMasterSettingChanged: function storage_umsMasterSettingChanged(evt) {
      var checkbox = evt.target;
      var cset = {};
      var umsSettingKey = 'ums.enabled';
      var warningKey = 'ums-turn-on-warning';
      if (checkbox.checked) {
        AsyncStorage.getItem(warningKey, function(showed) {
          if (!showed) {
            this._elements.umsWarningDialog.hidden = false;

            this._elements.umsConfirmButton.onclick = function() {
              cset[umsSettingKey] = true;
              Settings.mozSettings.createLock().set(cset);

              AsyncStorage.setItem(warningKey, true);
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);

            this._elements.umsCancelButton.onclick = function() {
              cset[umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);
          } else {
            cset[umsSettingKey] = true;
            Settings.mozSettings.createLock().set(cset);
          }
        }.bind(this));
      } else {
        cset[umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    // App Storage
    updateAppFreeSpace: function storage_updateAppFreeSpace() {
      DeviceStorageHelper.showFormatedSize(this._elements.appStorageDesc,
        'storageSize', AppStorage.storage.freeSize);
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
      this.getFreeSpace(volume, function(freeSpace) {
        DeviceStorageHelper.showFormatedSize(self._elements.mediaStorageDesc,
          'availableSize', freeSpace);
      });
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
    },

    getFreeSpace: function storage_getFreeSpace(storage, callback) {
      storage.freeSpace().onsuccess = function(e) {
        if (callback) {
          callback(e.target.result);
        }
      };
    }
  };

  return function ctor_root() {
    return new Storage();
  };
});
