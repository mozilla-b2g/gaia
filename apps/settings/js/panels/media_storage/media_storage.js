/**
 * Handle support panel functionality with SIM and without SIM
 */
define(function(require) {
  'use strict';

  var Volume = require('panels/media_storage/volume');
  var SettingsCache = require('modules/settings_cache');

  const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];

  /**
   * The whole purpose of this code is to detect when we're in the state of
   * having the UMS Enabled checkbox unchecked, but the SD-card is still
   * being shared with the PC.
   *
   * In this case, the user has to unplug the USB cable in order to actually
   * turn off UMS, and we put some text to that effect on the settings screen.
   */
  var MediaStorage = function() {
    this._elements = {};
    this._volumeList = [];
    this._documentStorageListener = false;
    this.usmEnabledVolume = {};
    this.umsVolumeShareState = false;
  };

  MediaStorage.prototype = {
    init: function ms_init(elements) {
      this._elements = elements;
      this._volumeList = this._initAllVolumeObjects();

      this.updateListeners();

      // Use visibilitychange so that we don't get notified of device
      // storage notifications when the settings app isn't visible.
      document.addEventListener('visibilitychange', this);
      //TODO: replace by observer
      this.registerUmsListener();

      this._elements.defaultMediaLocation.addEventListener('click', this);
      this.makeDefaultLocationMenu();

      window.addEventListener('localized', this);

      this.updateInfo();
    },

    _initAllVolumeObjects: function ms_initAllVolumeObjects() {
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
        volume.createView(this._elements.volumeListRootElement);
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
        var selectionMenu = self._elements.defaultMediaLocation;
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
      this._elements.defaultMediaLocation.blur();
      var self = this;
      this._elements.popup.hidden = false;
      this._elements.cancelBtn.onclick = function() {
        self._elements.popup.hidden = true;
      };
      this._elements.changeBtn.onclick = function() {
        self._elements.popup.hidden = true;
        setTimeout(function() {
          self._elements.defaultMediaLocation.focus();
        });
      };
    },

    updateListeners: function ms_updateListeners(callback) {
      var self = this;
      if (document.hidden) {
        // Settings is being hidden. Unregister our change listener so we won't
        // get notifications whenever files are added in another app.
        if (this._documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.removeEventListener('change', self);
          });
          this._documentStorageListener = false;
        }
      } else {
        if (!this._documentStorageListener) {
          this._volumeList.forEach(function(volume) {
            // use sdcard storage to represent this volume
            var volumeStorage = volume.storages.sdcard;
            volumeStorage.addEventListener('change', self);
          });
          this._documentStorageListener = true;
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
