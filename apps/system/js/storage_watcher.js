/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * DeviceStorageWatcher listens for nsIDOMDeviceStorage.onchange events
 * notifying about low device storage situations (see Bug 861921). When a
 * 'onchange' event containing a 'low-disk-space' reason is received, we show a
 * banner for a few seconds and pin a notification in the notifications center.
 * When the reason of the 'onchange' event is 'available-disk-space', we remove
 * the pinned notification, if one exists.
 */

'use strict';

var DeviceStorageWatcher = {

  init: function dsw_init() {
    this._lowDeviceStorage = false;

    this._ = navigator.mozL10n.get;

    this._appStorage = navigator.getDeviceStorage('apps');
    this._appStorage.addEventListener('change', this);

    this._container = document.getElementById('storage-watcher-container');
    this._container.onclick = this.containerClicked;

    this._message = this._container.querySelector('.message');
    this._availableSpace = this._container.querySelector('.available-space');
  },

  containerClicked: function dsw_containerClicked() {
    // We redirect the user to the app permissions section of the settings app
    // so she can uninstall 3rd party apps trying to recover from the low
    // storage situation. This is not the best solution, but the only one that
    // we have so far. In the future, we must expose how much storage each app
    // consumes, so the user has a better idea of which apps are consuming
    // more (see Bug 862408).
    new MozActivity({
      name: 'configure',
      data: {
        section: 'appPermissions'
      }
    });
  },

  hideNotification: function dsw_hideNotification() {
    this._lowDeviceStorage = false;
    if (this._container.classList.contains('displayed')) {
      this._container.classList.remove('displayed');
      NotificationScreen.decExternalNotifications();
    }
  },

  displayNotification: function dsw_displayNotification() {
    this._lowDeviceStorage = true;
    if (!this._container.classList.contains('displayed')) {
      this._container.classList.add('displayed');
      NotificationScreen.incExternalNotifications();
    }
  },

  lowDiskSpaceNotification: function dsw_lowDiskSpaceNotification(space) {
    var msg = this._('low-device-storage');
    var notification;
    if (space && typeof space.size !== 'undefined' && space.unit) {
      notification = msg + this._('free-space', {
        value: space.size,
        unit: space.unit
      });
    } else {
      notification = msg + this._('unknown-free-space');
    }
    SystemBanner.show(notification);

    this._message.textContent = msg;
    this.updateAvailableSpace(space);
    this.displayNotification();
  },

  updateAvailableSpace: function dsw_updateAvailableSpace(space) {
    if (space && typeof space.size !== 'undefined' && space.unit) {
      this._availableSpace.textContent = this._('free-space', {
        value: space.size,
        unit: space.unit
      });
    } else {
      this._availableSpace.textContent = this._('unknown-free-space');
    }
  },

  /**
   * Helper function to format the value returned by the
   * nsIDOMDeviceStorage.freeSpace call in a more readable way.
   */
  formatSize: function dsw_formatSize(size) {
    if (size === undefined || isNaN(size)) {
      return;
    }

    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024 && i < units.length) {
      size /= 1024;
      ++i;
    }

    var sizeString = size.toFixed((size < 1024 * 1024) ? 0 : 1);
    var sizeDecimal = parseFloat(sizeString);

    return {
      size: sizeDecimal,
      unit: this._('byteUnit-' + units[i])
    };
  },

  handleEvent: function dsw_handleEvent(evt) {
    if (evt.type !== 'change') {
      return;
    }

    switch (evt.reason) {
      // We get 'onchange' events with a 'low-disk-space' reason when a
      // modification of a file is identified while the device is in a low
      // storage situation. When we get the first notification, we have to
      // show a system banner and pin a notification in the notifications
      // center, containing the remaining free space. Consecutive events with
      // a 'low-disk-space' reason will only update the remaining free space.
      case 'low-disk-space':
        var self = this;
        var req = self._appStorage.freeSpace();
        req.onsuccess = function onsuccess() {
          var free;
          if (typeof req.result !== 'undefined') {
            free = self.formatSize(req.result);
          }
          if (self._lowDeviceStorage) {
            self.updateAvailableSpace(free);
            return;
          }
          self.lowDiskSpaceNotification(free);
        };
        req.onerror = function onerror() {
          self.lowDiskSpaceNotification();
        };
        break;

      case 'available-disk-space':
        this.hideNotification();
        break;
    }
  }
};

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);
  DeviceStorageWatcher.init();
});
