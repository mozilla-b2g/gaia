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

var MediaStorage = {
  init: function mediaStorage_init() {
    this.deviceStorage = navigator.getDeviceStorage('pictures');
    this.documentStorageListener = false;
    this.updateListeners();

    window.addEventListener('localized', this);

    // Use mozvisibilitychange so that we don't get notified of device
    // storage notifications when the settings app isn't visible.
    document.addEventListener('mozvisibilitychange', this);
  },

  initUI: function mediaStorage_initUI() {
    this.umsEnabledCheckBox = document.querySelector('[name="ums.enabled"]');
    this.umsEnabledInfoBlock = document.getElementById('ums-desc');
    if (!this.umsEnabledCheckBox || !this.umsEnabledInfoBlock) {
      return;
    }

    // The normal handling of the checkboxes in the settings is done through a
    // 'change' event listener in settings.js
    this.umsEnabledCheckBox.onchange = function umsEnabledChanged() {
      MediaStorage.updateInfo();
    };

    this.updateInfo();
  },

  handleEvent: function mediaStorage_handleEvent(evt) {
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

  updateListeners: function mediaStorage_updateListeners() {
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

  updateInfo: function mediaStorage_updateInfo() {
    var self = this;

    var statreq = this.deviceStorage.stat();
    statreq.onsuccess = function mediaStorage_statSuccess(evt) {
      var state = evt.target.result.state;

      // show/hide the 'Unplug USB cable to disable' message when available
      if (self.umsEnabledInfoBlock) {
        if ((state === 'shared') && !self.umsEnabledCheckBox.checked) {
          self.umsEnabledInfoBlock.style.display = 'block';
        } else {
          self.umsEnabledInfoBlock.style.display = 'none';
        }
      }

      var mediaSubtitle = document.getElementById('media-storage-desc');
      var _ = navigator.mozL10n.get;

      switch (state) {
        case 'shared':
          mediaSubtitle.textContent = '';
          // Keep the media storage enabled, so that the user go inside to
          // toggle USB Mass storage
          self.setEnabledState(true);
          self.setInfoInvalid();
          break;

        case 'unavailable':
          mediaSubtitle.textContent = _('no-storage');
          self.setEnabledState(false);
          self.setInfoInvalid();
          break;

        case 'available':
          self.setEnabledState(true);
          self.updateStorageInfo();
          break;
      }
    };
  },

  setEnabledState: function mediaStorage_setEnabledState(enabled) {
    var mediaStorageSection = document.getElementById('media-storage-section');
    if (!mediaStorageSection)
      return;
    if (enabled) {
      mediaStorageSection.classList.remove('disabled');
    } else {
      mediaStorageSection.classList.add('disabled');
    }
  },

  setInfoInvalid: function mediaStorage_setInfoInvalid() {
    var _ = navigator.mozL10n.get;

    // clear the space info when it is disabled
    var idList = [
      'music-space', 'pictures-space', 'videos-space', 'media-free-space'];
    idList.forEach(function clearSpace(id) {
      var element = document.getElementById(id);
      if (element) {
        element.firstElementChild.textContent = _('size-not-available');
      }
    });
  },

  updateStorageInfo: function mediaStorage_updateStorageInfo() {
    var _ = navigator.mozL10n.get;

    function formatSize(element, size, l10nId) {
      if (!element)
        return;

      if (!l10nId) {
        l10nId = 'size-';
      }

      // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
      var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

      element.textContent = _(l10nId + sizeInfo.unit, { size: sizeInfo.size });
    }

    // Update the storage details
    DeviceStorageHelper.getStat('music', function(size) {
      var element = document.getElementById('music-space');
      formatSize(element, size);
    });

    DeviceStorageHelper.getStat('pictures', function(size) {
      var element = document.getElementById('pictures-space');
      formatSize(element, size);
    });

    DeviceStorageHelper.getStat('videos', function(size, freeSize) {
      var element = document.getElementById('videos-space');
      formatSize(element, size);

      element = document.getElementById('media-free-space');
      formatSize(element, freeSize);

      element = document.getElementById('media-storage-desc');
      formatSize(element, freeSize, 'available-size-');
    });
  }
};

MediaStorage.init();

