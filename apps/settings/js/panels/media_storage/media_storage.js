/**
 * Handle support panel functionality with SIM and without SIM
 */
define(function(require) {
  'use strict';

  var Volume = require('panels/media_storage/volume');
  var SettingsCache = require('modules/settings_cache');

  /**
   * The whole purpose of this code is to detect when we're in the state of
   * having the UMS Enabled checkbox unchecked, but the SD-card is still
   * being shared with the PC.
   *
   * In this case, the user has to unplug the USB cable in order to actually
   * turn off UMS, and we put some text to that effect on the settings screen.
   */
  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];

  var MediaStorage = function() {
    this.documentStorageListener = false;
    this.usmEnabledVolume = {};
    this.umsVolumeShareState = false;
  };

  MediaStorage.prototype = {
    init: function ms_init() {
      this._volumeList = this.initAllVolumeObjects();

      this.updateListeners();

      // Use visibilitychange so that we don't get notified of device
      // storage notifications when the settings app isn't visible.
      document.addEventListener('visibilitychange', this);
      //TODO: replace by observer
      this.registerUmsListener();

      this.defaultMediaLocation =
        document.getElementById('defaultMediaLocation');
      this.defaultMediaLocation.addEventListener('click', this);
      this.makeDefaultLocationMenu();

      window.addEventListener('localized', this);

      this.updateInfo();
    },

    initAllVolumeObjects: function ms_initAllVolumeObjects() {
      var volumes = {};
      var totalVolumes = 0;
      MEDIA_TYPE.forEach(function(type) {
        var storages = navigator.getDeviceStorages(type);
        storages.forEach(function(storage) {
          var name = storage.storageName;
          if (!volumes.hasOwnProperty(name)) {
            volumes[name] = {};
            totalVolumes++;
          }
          volumes[name][type] = storage;
        });
      });

      var volumeList = [];
      var externalIndex = 0;
      var volumeListRootElement = document.getElementById('volume-list');
      for (var name in volumes) {
        var volume;
        // XXX: This is a heuristic to determine whether a storage is
        // internal or external (e.g. a pluggable SD card). It does *not* 
        // work in general, but it works for all officially-supported devices.
        if (totalVolumes > 1 && name === 'sdcard') {
          volume = new Volume(name, false /* internal */, 0, volumes[name]);
        } else {
          volume = new Volume(name, true /* external */, externalIndex++,
                              volumes[name]);
        }
        volume.createView(volumeListRootElement);
        volumeList.push(volume);
      }
      return volumeList;
    },

    registerUmsListener: function ms_registerUmsListener() {
      var self = this;
      var settings = Settings.mozSettings;
      this._volumeList.forEach(function(volume, index) {
        var key = 'ums.volume.' + volume.name + '.enabled';
        SettingsCache.getSettings(function(result) {
          var input = document.querySelector('input[name="' + key + '"]');
          input.checked = result[key] || false;
          self.usmEnabledVolume[index] = input.checked;
        });
        settings.addObserver(key, function(evt) {
          self.usmEnabledVolume[index] = evt.settingValue;
        });
      });
    },

    handleEvent: function ms_handleEvent(evt) {
      switch (evt.type) {
        case 'localized':
          this.updateInfo();
          break;
        case 'change':
          // if (evt.target.id === 'ums-switch') {
          //   Storage.umsMasterSettingChanged(evt);
          // } else {
            // we are handling storage state changes
            // possible state: available, unavailable, shared
            this.updateInfo();
          // }
          break;
        case 'click':
          this.changeDefaultStorage();
          break;
        case 'visibilitychange':
          this.updateListeners(this.updateInfo.bind(this));
          break;
      }
    },

    makeDefaultLocationMenu: function ms_makeDefaultLocationMenu() {
      var _ = navigator.mozL10n.get;
      var self = this;
      var defaultMediaVolumeKey = 'device.storage.writable.name';
      SettingsCache.getSettings(function(result) {
        var defaultName = result[defaultMediaVolumeKey];
        var selectionMenu = self.defaultMediaLocation;
        var selectedIndex = 0;
        self._volumeList.forEach(function(volume, index) {
          var option = document.createElement('option');
          option.value = volume.name;
          var l10nId = volume.getL10nId(true);
          option.dataset.l10nId = l10nId;
          option.textContent = _(l10nId);
          selectionMenu.appendChild(option);
          if (defaultName && volume.name === defaultName) {
            selectedIndex = index;
          }
        });
        var selectedOption = selectionMenu.options[selectedIndex];
        selectedOption.selected = true;

        // disable option menu if we have only one option
        if (self._volumeList.length === 1) {
          selectionMenu.disabled = true;
          var obj = {};
          obj[defaultMediaVolumeKey] = selectedOption.value;
          Settings.mozSettings.createLock().set(obj);
        }
      });
    },

    changeDefaultStorage: function ms_changeDefaultStorage() {
      //Pop up a confirm window before listing options.
      var popup = document.getElementById('default-location-popup-container');
      var cancelBtn = document.getElementById('default-location-cancel-btn');
      var changeBtn = document.getElementById('default-location-change-btn');

      this.defaultMediaLocation.blur();
      var self = this;
      popup.hidden = false;
      cancelBtn.onclick = function() {
        popup.hidden = true;
      };
      changeBtn.onclick = function() {
        popup.hidden = true;
        setTimeout(function() {
          self.defaultMediaLocation.focus();
        });
      };
    },

    updateListeners: function ms_updateListeners(callback) {
      var self = this;
      if (document.hidden) {
        // Settings is being hidden. Unregister our change listener so we won't
        // get notifications whenever files are added in another app.
        if (this.documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.removeEventListener('change', self);
          });
          this.documentStorageListener = false;
        }
      } else {
        if (!this.documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.addEventListener('change', self);
          });
          this.documentStorageListener = true;
        }
        if (callback && Settings.currentPanel === '#mediaStorage') {
          callback();
        }
      }
    },

    updateInfo: function ms_updateInfo() {
      var self = this;
      this.umsVolumeShareState = false;
      this._volumeList.forEach(function(volume) {
        volume.updateInfo(function(state) {
          if (state === 'shared') {
            self.umsVolumeShareState = true;
          }
        });
      });
    }
  };

  return function ctor_support() {
    return new MediaStorage();
  };
});
