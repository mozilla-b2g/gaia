'use strict';

require([
  'shared/settings_listener'
], function(exports, SettingsListener) {
  var Storage = {
    appStorage: null,
    defaultMediaVolume: null,
    defaultVolumeState: 'available',

    init: function storage_init() {
      var self = this;

      // ums master switch on root panel
      var umsSettingKey = 'ums.enabled';
      this.umsEnabledCheckBox = document.getElementById('ums-switch-root');
      this.umsEnabledInfoBlock = document.getElementById('ums-desc-root');
      this.umsEnabledCheckBox.addEventListener('change', this);
      SettingsListener.observe(umsSettingKey, false, function(enabled) {
        self.umsEnabledCheckBox.checked = enabled;
        self.updateUmsInfo();
      });

      // application storage
      this.appStorage = navigator.getDeviceStorage('apps');
      this.appStorageDesc = document.getElementById('application-storage-desc');
      this.updateAppFreeSpace();

      // media storage
      // Show default media volume state on root panel
      this.mediaStorageDesc = document.getElementById('media-storage-desc');

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
          if (evt.target.id === 'ums-switch-root') {
            this.umsMasterSettingChanged(evt);
          } else {
            // we are handling storage state changes
            // possible state: available, unavailable, shared
            this.updateMediaStorageInfo();
          }
          break;
      }
    },

    // ums info
    updateUmsInfo: function storage_updateUmsInfo() {
      var localize = navigator.mozL10n.localize;
      var key;
      if (this.umsEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this.defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      localize(this.umsEnabledInfoBlock, key);
    },
    umsMasterSettingChanged: function storage_umsMasterSettingChanged(evt) {
      var _ = navigator.mozL10n.get;
      var checkbox = evt.target;
      var cset = {};
      var umsSettingKey = 'ums.enabled';
      var warningKey = 'ums-turn-on-warning';
      var umsWarningDialog = document.getElementById('turn-on-ums-dialog');
      var umsConfirmButton = document.getElementById('ums-confirm-option');
      var umsCancelButton = document.getElementById('ums-cancel-option');

      if (checkbox.checked) {
        window.asyncStorage.getItem(warningKey, function(showed) {
          if (!showed) {
            umsWarningDialog.hidden = false;

            umsConfirmButton.onclick = function() {
              cset[umsSettingKey] = true;
              Settings.mozSettings.createLock().set(cset);

              window.asyncStorage.setItem(warningKey, true);
              umsWarningDialog.hidden = true;
            };

            umsCancelButton.onclick = function() {
              cset[umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              umsWarningDialog.hidden = true;
            };
          } else {
            cset[umsSettingKey] = true;
            Settings.mozSettings.createLock().set(cset);
          }
        });
      } else {
        cset[umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    },

    // Application Storage
    updateAppFreeSpace: function storage_updateAppFreeSpace() {
      var self = this;
      this.getFreeSpace(this.appStorage, function(freeSpace) {
        DeviceStorageHelper.showFormatedSize(self.appStorageDesc,
          'availableSize', freeSpace);
      });
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
      this.updateUmsInfo();
      switch (state) {
        case 'available':
          this.updateMediaFreeSpace(volume);
          this.lockMediaStorageMenu(false);
          break;

        case 'shared':
          localize(this.mediaStorageDesc, '');
          this.lockMediaStorageMenu(false);
          break;

        case 'unavailable':
          localize(this.mediaStorageDesc, 'no-storage');
          this.lockMediaStorageMenu(true);
          break;
      }
    },

    updateMediaFreeSpace: function storage_updateMediaFreeSpace(volume) {
      var self = this;
      this.getFreeSpace(volume, function(freeSpace) {
        DeviceStorageHelper.showFormatedSize(self.mediaStorageDesc,
          'availableSize', freeSpace);
      });
    },

    lockMediaStorageMenu: function storage_setMediaMenuState(lock) {
      var mediaStorageSection =
        document.getElementById('media-storage-section');
      if (lock) {
        mediaStorageSection.setAttribute('aria-disabled', true);
      } else {
        mediaStorageSection.removeAttribute('aria-disabled');
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
        if (callback)
          callback(e.target.result);
      };
    }
  };

  navigator.mozL10n.once(Storage.init.bind(Storage));

  // XXX - remove this when this file is a real AMD module
  exports.Storage = Storage;
}.bind(null, window));
