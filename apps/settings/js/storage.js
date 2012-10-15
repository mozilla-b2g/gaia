/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The whole purpose of this code is to detect when we're in the state of having
 * the UMS Enabled checkbox unchecked, but the SD-card is still being shared
 * with the PC.
 *
 * In this case, the user has to unplug the USB cable in order to actually turn
 * off UMS, and we put some text to that effect on the settings screen.
 */

var StorageSettings = {

  init: function storageSettingsInit() {
    this.umsEnabledCheckBox = document.querySelector('[name="ums.enabled"]');
    if (!this.umsEnabledCheckBox) {
      return;
    }
    this.umsEnabledInfoBlock = document.querySelector('#ums-desc');
    if (!this.umsEnabledInfoBlock) {
      return;
    }

    // The normal handling of the checkboxes in the settings is done through a
    // 'change' event listener in settings.js
    this.umsEnabledCheckBox.onchange = function umsEnabledChanged() {
      StorageSettings.updateInfo();
    };

    this.deviceStorage = navigator.getDeviceStorage('pictures');
    this.documentStorageListener = false;
    this.updateListeners();

    window.addEventListener('localized', this);

    // Use mozvisibilitychange so that we don't get notified of device
    // storage notifications when the settings app isn't visible.
    document.addEventListener('mozvisibilitychange', this);
  },

  handleEvent: function storageSettingsHandleEvent(evt) {
    switch (evt.type) {
      case 'localized':
        this.updateInfo();
        break;
      case 'change':
        switch (evt.reason) {
          case 'available':
          case 'unavailable':
          case 'shared':
            this.updateInfo();
            break;
        }
        break;
      case 'mozvisibilitychange':
        this.updateListeners();
        break;
    }
  },

  updateListeners: function storageSettingsUpdateListeners() {
    if (document.mozHidden) {
      // Settings is being hidden. Unregister our change listener so we won't
      // get notifications whenever files are added in another app.
      if (this.documentStorageListener) {
        this.deviceStorage.removeEventListener('change', this);
        this.documentStorageListener = false;
      }
    } else {
      if (!this.documentStorageListener) {
        this.deviceStorage.addEventListener('change', this);
        this.documentStorageListener = true;
      }
      this.updateInfo();
    }
  },

  updateInfo: function storageSettingsUpdateInfo() {
    var statreq = this.deviceStorage.stat();
    var self = this;

    statreq.onsuccess = function storageSettingsStatSuccess(evt) {
      var state = evt.target.result.state;
      if ((state === 'shared') &&
          !StorageSettings.umsEnabledCheckBox.checked) {
        // Show the 'Unplug USB cable to disable' message
        StorageSettings.umsEnabledInfoBlock.style.display = 'block';
      } else {
        // Hide the 'Unplug USB cable to disable' message
        StorageSettings.umsEnabledInfoBlock.style.display = 'none';
      }

      var mediaSubtitle = document.getElementById('media-storage-desc');
      var _ = navigator.mozL10n.get;

      switch (state) {
        case 'shared':
          // Keep the media storage enabled, so that the user go inside to
          // toggle USB Mass storage
          StorageSettings.enableMediaStorage(true);
          mediaSubtitle.textContent = '';
          self.setMediaStorageInfoInvalid();
          break;

        case 'unavailable':
          StorageSettings.enableMediaStorage(false);
          mediaSubtitle.textContent = _('no-storage');
          self.setMediaStorageInfoInvalid();
          break;

        case 'available':
          StorageSettings.enableMediaStorage(true);
          self.updateMediaStorageInfo();
          break;
      }
    };
  },

  enableMediaStorage: function storageSettingsDisableMediaStorage(enable) {

    var mediaStorageSection = document.getElementById('media-storage-section');
    if (enable) {
      mediaStorageSection.classList.remove('disabled');
    } else {
      mediaStorageSection.classList.add('disabled');
    }
  },

  setMediaStorageInfoInvalid: function setMediaStorageInfoInvalid() {
    var _ = navigator.mozL10n.get;

    // clear the space info when it is disabled
    var idList = ['music-space', 'pictures-space', 'videos-space',
                  'media-free-space'];

    idList.forEach(function clearSpace(id) {
      var element = document.getElementById(id).firstElementChild;
      element.textContent = _('size-not-available');
    });
  },

  updateMediaStorageInfo: function updateMediaStorageInfo(usedSize, freeSize) {
    var _ = navigator.mozL10n.get;

    function formatSize(element, size, l10nId) {
      if (!element)
        return;

      if (!l10nId)
        l10nId = 'size-';

      // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
      var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

      element.textContent = _(l10nId + sizeInfo.unit,
                              {size: sizeInfo.size});
    }

    // Update the storage details
    DeviceStorageHelper.getStat('music', function(size) {
      var element = document.getElementById('music-space').firstElementChild;
      formatSize(element, size);
    });

    DeviceStorageHelper.getStat('pictures', function(size) {
      var element = document.getElementById('pictures-space').firstElementChild;
      formatSize(element, size);
    });

    DeviceStorageHelper.getStat('videos', function(size, freeSize) {
      var element = document.getElementById('videos-space').firstElementChild;
      formatSize(element, size);

      element = document.getElementById('media-free-space').firstElementChild;
      formatSize(element, freeSize);

      element = document.getElementById('media-storage-desc');
      formatSize(element, freeSize, 'available-size-');
    });
  }
};

var DeviceStorageHelper = (function DeviceStorageHelper() {

    function getStat(type, callback) {
      var deviceStorage = navigator.getDeviceStorage(type);

      if (!deviceStorage) {
        console.error('Cannot get DeviceStorage for: ' + type);
        return;
      }

      var request = deviceStorage.stat();

      request.onsuccess = function(e) {
        var totalSize = e.target.result.totalBytes;
        callback(e.target.result.totalBytes,
                 e.target.result.freeBytes);
      };
    }

    return {
      getStat: getStat
    };
})();

StorageSettings.init();

