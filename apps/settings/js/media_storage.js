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
    if (!this.umsEnabledCheckBox || !this.umsEnabledInfoBlock)
      return;

    // The normal handling of the checkboxes in the settings is done through a
    // 'change' event listener in settings.js
    this.umsEnabledCheckBox.onchange = function umsEnabledChanged() {
      MediaStorage.updateInfo();
    };
    stackedBar.init('space-stackedbar');
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

    var availreq = this.deviceStorage.available();
    availreq.onsuccess = function mediaStorage_availSuccess(evt) {
      var _ = navigator.mozL10n.get;
      var state = evt.target.result;

      var infoBlock = self.umsEnabledInfoBlock;
      if (infoBlock) {
         if (self.umsEnabledCheckBox.checked) {
           infoBlock.textContent = _('enabled');
         } else if (state === 'shared') {
           infoBlock.textContent = _('umsUnplugToDisable');
         } else {
           infoBlock.textContent = _('disabled');
         }
      }

      var mediaSubtitle = document.getElementById('media-storage-desc');
      switch (state) {
        case 'shared':
          mediaSubtitle.textContent = '';
          mediaSubtitle.dataset.l10nId = '';
          // Keep the media storage enabled,
          // so that the user goes inside to toggle USB Mass storage.
          self.setEnabledState(true);
          self.setInfoInvalid();
          break;

        case 'unavailable':
          mediaSubtitle.textContent = _('no-storage');
          mediaSubtitle.dataset.l10nId = 'no-storage';
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
    var idList = ['#music-space .size', '#pictures-space .size',
      '#videos-space .size', '#media-free-space .size'];
    idList.forEach(function clearSpace(id) {
      var element = document.querySelector(id);
      if (element) {
        element.textContent = _('size-not-available');
      }
    });
  },

  updateStorageInfo: function mediaStorage_updateStorageInfo() {
    var _ = navigator.mozL10n.get;
    function formatSize(element, size, l10nId) {
      if (!element)
        return;

      if (size === undefined || isNaN(size)) {
        element.textContent = '';
        return;
      }

      // KB - 3 KB (nearest ones), MB, GB - 1.2 MB (nearest tenth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 1;
      var sizeInfo = FileSizeFormatter.getReadableFileSize(size, fixedDigits);

      element.textContent = _(l10nId || 'storageSize', {
        size: sizeInfo.size,
        unit: _('byteUnit-' + sizeInfo.unit)
      });
    }

    DeviceStorageHelper.getFreeSpace(function(freeSize) {
      var element = document.getElementById('media-storage-desc');
      formatSize(element, freeSize, 'availableSize');
    });

    // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=844709
    // if the sub-menu hasn't been loaded because of lazy-loading
    // we don't need to update these fields
    var element = document.querySelector('#music-space .size');
    if (!element)
      return;

    // Update the storage details
    stackedBar.reset();
    DeviceStorageHelper.getStats(['music', 'pictures', 'videos'],
      function(sizes) {
        formatSize(element, sizes['music']);
        stackedBar.add(new StackBarItem('music', sizes['music']));

        element = document.querySelector('#pictures-space .size');
        formatSize(element, sizes['pictures']);
        stackedBar.add(new StackBarItem('pictures', sizes['pictures']));

        element = document.querySelector('#videos-space .size');
        formatSize(element, sizes['videos']);
        stackedBar.add(new StackBarItem('videos', sizes['videos']));

        element = document.querySelector('#media-free-space .size');
        formatSize(element, sizes['free']);
        stackedBar.add(new StackBarItem('free', sizes['free']));

        stackedBar.refreshUI();
    });
  }
};

function StackBarItem(id, value) {

  this.id = id;

  this.value = value;

}

var stackedBar = {
  _targetId: null,
  _items: [],
  _total: 0,

  _initUI: function sb_initui(targetId) {
    this._targetId = targetId;
  },

  init: function sb_init(targetId) {
    this._initUI(targetId);
  },

  add: function sb_add(item) {
    this._total = this._total + item.value;
    this._items.push(item);
  },

  refreshUI: function sb_refreshUI() {
    var container = document.getElementById(this._targetId);
    if (!container)
      return;
    for (var i = 0; i < this._items.length; i++) {
      var item = document.getElementById('stackedbar-item-' +
          this._items[i].id);
      if (!item)
        item = document.createElement('span');
      item.className = 'stackedbar-item';
      item.id = 'stackedbar-item-' + this._items[i].id;
      item.style.width = (this._items[i].value * 100) / this._total + '%';
      container.appendChild(item);
    }
  },

  reset: function sb_reset() {
    this._items = [];
    this._total = 0;
  }
};

navigator.mozL10n.ready(MediaStorage.init.bind(MediaStorage));
