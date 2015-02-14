'use strict';
/* global Notification, MozActivity, NotificationHelper */

(function(exports) {

  /**
   * ExternalStorageMonitor listens to external storage(should be
   * insterted/removed SD card slot) for the volume chagne event.
   * According to the status activity, we use regular expression to indentify
   * storage actions.
   * @class ExternalStorageMonitor
   */
  function ExternalStorageMonitor() {
    // We will monitor external storage. And the external storage should be
    // removable.
    var storages = navigator.getDeviceStorages('sdcard');

    // If there are two storages, the name of first storage name is 'sdcard'.
    // But it's an internal storage. The storage name is mapping to
    // a hard code name. Because name of some external storages are different.
    // Such as, Flame: 'external', Helix: 'extsdcard'.
    // XXX: Bug 1033952 - Implement "isRemovable" API for device storage
    // Once "isRemovable" attribute is ready, we can remove the dirty check here
    if (storages.length > 1) {
      storages.some(function(storage) {
        if (storage.storageName != 'sdcard' && storage.canBeMounted) {
          this._storage = storage;
        }
      }.bind(this));
    } else {
      this._storage = storages[0];
    }
  }

  const RESET_JUST_ENTER_IDLE_STATUS_MILLISECONDS = 1000;

  ExternalStorageMonitor.prototype = {

    /**
     * ums.mode setting value when the automounter is disabled.
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    statusStack: [],

    /**
     * Volume state "Init".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Init: -1,

    /**
     * Volume state "NoMedia"(Removed).
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    NoMedia: 0,

    /**
     * Volume state "Idle"(Unmounted).
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Idle: 1,

    /**
     * Volume state "Pending".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Pending: 2,

    /**
     * Volume state "Checking".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Checking: 3,

    /**
     * Volume state "Mounted".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Mounted: 4,

    /**
     * Volume state "Unmounting".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Unmounting: 5,

    /**
     * Volume state "Formatting".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Formatting: 6,

    /**
     * Volume state "Shared"(Unmounted in shared mode).
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    Shared: 7,

    /**
     * Volume state "Shared-Mounted".
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    // It's defined in android storage void. But never see the event comes.
    // Shared-Mounted: 8,

    /**
     * Volume RegExp "actionRecognised".
     * If a user inserted formatted and raedable SD card,
     * Volume State Machine will run in this flow.
     * State flow:
     * NoMedia --> Pending --> Idle(Unmounted) --> Checking --> Mounted
     *
     * Enumerate value:
     * 0 --> 2 --> 1 --> 3 --> 4
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionRecognised: /02134$/,

    /**
     * Volume RegExp "actionUnrecognised".
     * If a user inserted an unformatted or can not readable format SD card,
     * Volume State Machine will run in this flow.
     * State flow:
     * NoMedia --> Idle(Unmounted) --> Checking --> Idle(Unmounted)
     *
     * Enumerate value:
     * 0 --> 1 --> 3 --> 1
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionUnrecognised: /0131$/,

    /**
     * Volume RegExp "actionUnrecognisedAfterRechecked".
     * If there is an unformatted or format-not-readable SD card in slot,
     * volume storage will recheck it for mounting. Once the storage is not able
     * to be mounted, Volume State Machine will run in this flow.
     * State flow:
     * Idle(Unmounted) --> Checking --> Idle(Unmounted)
     *
     * Enumerate value:
     * 1 --> 3 --> 1
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionUnrecognisedAfterRechecked: /131$/,

    /**
     * Volume RegExp "actionUnrecognisedAfterFormatted".
     * A SD card is still unrecognised after a user formatted an unformatted or
     * can not readable format SD card.
     * Volume State Machine will run in this flow.
     * State flow:
     * Idle(Unmounted) --> Formatting --> Idle(Unmounted)
     *
     * Enumerate value:
     * 1 --> 6 --> 1
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionUnrecognisedAfterFormatted: /161$/,

    /**
     * Volume RegExp "actionRemoved".
     * If a user unmount SD card successfully,
     * Volume State Machine will run in this flow.
     * State flow:
     * Mounted --> Unmounting --> Idle(Unmounted) --> NoMedia
     *
     * Enumerate value:
     * 4 --> 5 --> 1 --> 0
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionRemoved: /4510$/,

    /**
     * Volume RegExp "actionUnrecognisedStorageRemoved".
     * If a user unmount SD card successfully,
     * Volume State Machine will run in this flow.
     * State flow:
     * Idle(Unmounted) --> NoMedia
     *
     * Enumerate value:
     * 1 --> 0
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {RegExp}
     */
    actionUnrecognisedStorageRemoved: /10$/,

    /**
     * A flag to identify the storage status has been into Idle(Unmounted).
     * We will use the flag to distinguish removal SD card manually or not.
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {Boolean}
     */
    justEnterIdleLessThanOneSecond: null,

    /**
     * An integer with the ID value of the timer that is set.
     * We will clean the timer if create a new timer.
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {Integer}
     */
    resetJustEnterIdleFlagTimer: null,

    /**
     * An variable for maintain the storage status.
     *
     * @memberof ExternalStorageMonitor.prototype
     * @type {Object}
     */
    _storage: null,

    /**
     * Listene to storage 'change' event.
     * @memberof ExternalStorageMonitor.prototype
     * @private
     */
    start: function() {
      if (!this._storage) {
        return;
      }

      this._storage.addEventListener('storage-state-change', this);
      var msg = '[ExternalStorageMonitor] initEvent(): ' +
                'monitor external storage name = ' + this._storage.storageName +
                ', canBeMounted = ' + this._storage.canBeMounted;
      this.debug(msg);
    },

    /**
     * Push latest storage status in statusStack
     * @memberof ExternalStorageMonitor.prototype
     * @param {string} str The value we are pushing in stack. The string is
     * mapping to the storage status. And the status are defined in
     * ExternalStorageMonitor property.
     */
    pushStatus: function(status) {
      this.statusStack.push(this[status]);
    },

    /**
     * The function keep the latest storage status. And put the status be the
     * the first element in a new array.
     * @memberof ExternalStorageMonitor.prototype
     */
    clearStatus: function() {
      this.statusStack = [this.statusStack.pop()];
      var actionsFlags = this.statusStack.join('');
      var msg = '[ExternalStorageMonitor] clearStatus(): ' +
                'actionsFlags = ' + actionsFlags;
      this.debug(msg);
    },

    /**
     * Trigger a timer to set flag 'justEnterIdleLessThanOneSecond' be true.
     * We will use the flag to speculate the action of storage removal manually
     * or not.
     * @memberof ExternalStorageMonitor.prototype
     * @param {} str The value we are pushing in stack.
     */
    enableEnterIdleStateTimer: function() {
      this.justEnterIdleLessThanOneSecond = true;

      if (this.resetJustEnterIdleFlagTimer) {
        clearTimeout(this.resetJustEnterIdleFlagTimer);
      }

      // reset the flag after 1000 milliseconds
      this.resetJustEnterIdleFlagTimer = setTimeout(function() {
        this.justEnterIdleLessThanOneSecond = false;
      }.bind(this), RESET_JUST_ENTER_IDLE_STATUS_MILLISECONDS);
    },

    /**
     * Recognise storage actions.
     * @memberof ExternalStorageMonitor.prototype
     * @private
     */
    recogniseStorageActions: function() {
      var actionsFlags = this.statusStack.join('');
      var msg = '[ExternalStorageMonitor] recogniseStorageActions(): ' +
                'actionsFlags = ' + actionsFlags;
      this.debug(msg);

      if (actionsFlags.match(this.actionRecognised)) {
        this.clearStatus();
        // reset settings key 'volume.external.unrecognised' to be false
        this.enableStorageUnrecognised(false);
        // notify SD card detected
        this.createMessage('detected-recognised');
      } else if (actionsFlags.match(this.actionUnrecognised)) {
        this.clearStatus();
        // XXX: Bug 1060252 - Request deviceStorages API pass volume storage
        // activity event. Once API is ready to maintain state machine, it will
        // pass storage activity immediately. Then, system and settings app is
        // able to receive change event without maintain state machine. And we
        // can remove set mozSettings key here.
        // change settings key 'volume.external.unrecognised' to be true
        this.enableStorageUnrecognised(true);
        // notify unknown SD card detected
        this.createMessage('detected-unrecognised');
      } else if (actionsFlags.match(this.actionUnrecognisedAfterRechecked)) {
        this.clearStatus();
        // change settings key 'volume.external.unrecognised' to be true
        this.enableStorageUnrecognised(true);
      } else if (actionsFlags.match(this.actionUnrecognisedAfterFormatted)) {
        this.clearStatus();
        // change settings key 'volume.external.unrecognised' to be true
        this.enableStorageUnrecognised(true);
      } else if (actionsFlags.match(this.actionRemoved)) {
        this.clearStatus();
        // reset settings key 'volume.external.unrecognised' to be false
        this.enableStorageUnrecognised(false);
        // identify SD card removed expectedly or not
        if (!this.justEnterIdleLessThanOneSecond) {
          // notify SD card safely removed
          this.createMessage('normally-removed');
        } else {
          // notify SD card unexpectedly removed
          this.createMessage('unexpectedly-removed');
        }
      } else if (actionsFlags.match(this.actionUnrecognisedStorageRemoved)) {
        this.clearStatus();
        // reset settings key 'volume.external.unrecognised' to be false
        this.enableStorageUnrecognised(false);
      }
    },

    /**
     * Set settings key 'volume.external.unrecognised' to be boolean.
     * @memberof ExternalStorageMonitor.prototype
     * @type {Boolean}
     */
    enableStorageUnrecognised: function(enabled) {
      var setRequest = navigator.mozSettings.createLock().set({
        'volume.external.unrecognised': enabled
      });

      setRequest.onerror = function() {
        var msg = '[ExternalStorageMonitor] set settings key error:' +
                  setRequest.error.name;
        this.debug(msg);
      }.bind(this);

      setRequest.onsuccess = function() {
        var msg = '[ExternalStorageMonitor] set settings key onsuccess';
        this.debug(msg);
      }.bind(this);
    },

    /**
     * Create message for the storage activity.
     * @memberof ExternalStorageMonitor.prototype
     * @param {action} str The string we figure out the storage action
     */
    createMessage: function(action) {
      var msg = '[ExternalStorageMonitor] createMessage(): action = ' + action;
      this.debug(msg);

      // Prepare message for fire notification.
      var titleL10n, bodyL10n;
      switch (action) {
        case 'detected-recognised':
          this.getTotalSpace(function(totalSpace) {
            titleL10n = 'sdcard-detected-title';
            bodyL10n = {
              'id': 'sdcard-total-size-body',
              'args': {
                size: totalSpace.size,
                unit: totalSpace.unit
              }
            };
            this.fireNotification(titleL10n, bodyL10n, true);
          }.bind(this));
          break;
        case 'detected-unrecognised':
          titleL10n = 'sdcard-detected-title';
          bodyL10n = 'sdcard-unknown-size-then-tap-to-format-body';
          this.fireNotification(titleL10n, bodyL10n, true);
          break;
        case 'normally-removed':
          titleL10n = 'sdcard-removed-title';
          bodyL10n = 'sdcard-removed-ejected-successfully';
          this.fireNotification(titleL10n, bodyL10n);
          break;
        case 'unexpectedly-removed':
          titleL10n = 'sdcard-removed-title';
          bodyL10n = 'sdcard-removed-not-ejected-properly';
          this.fireNotification(titleL10n, bodyL10n);
          break;
      }
    },

    /**
     * Notify user what the storage is activate.
     * @memberof ExternalStorageMonitor.prototype
     * @param {title} str The string we show on the title of notification
     * @param {body} str The string we show on the body of notification
     */
    fireNotification: function(title, body, openSettings) {
      var iconUrl = window.location.origin + '/style/storage_status/' +
                    'notification_sd_card.png';
      // We always use tag "sdcard-storage-status" to manage these notifications
      var notificationId = 'sdcard-storage-status';

      var options = {
        'bodyL10n': body,
        'icon': iconUrl,
        'tag': notificationId
      };

      NotificationHelper.send(title, options).then(function(notification) {
        // set onclick handler for the notification
        notification.addEventListener( 'click', function() {
          this.notificationHandler.bind(this, notification, openSettings);
        });
      });
    },

    /**
     * Handle notification while it be triggered 'onclick' event.
     * @memberof ExternalStorageMonitor.prototype
     * @private
     */
    notificationHandler: function(notification, openSettings) {
      // close the notification
      notification.close();

      // request configure activity for settings media storage
      if (!openSettings) {
        return;
      }

      var activityReq = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'mediaStorage'
        }
      });
      activityReq.onerror = function(e) {
        var msg = '[ExternalStorageMonitor] configure activity error:' +
                  activityReq.error.name;
        this.debug(msg);
      }.bind(this);

      activityReq.onsuccess = function(e) {
        var msg = '[ExternalStorageMonitor] configure activity onsuccess';
        this.debug(msg);
      }.bind(this);
    },

    /**
     * General event handler interface.
     * @memberof ExternalStorageMonitor.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      switch (e.type) {
        case 'storage-state-change':
          var storageStatus = e.reason;
          var msg = '[ExternalStorageMonitor] received ' +
                    '"storage-state-change" event ' +
                    'storageStatus = ' + storageStatus;
          this.debug(msg);

          this.pushStatus(storageStatus);
          // checking 'Idle' state for set flag on
          if (storageStatus === 'Idle') {
            this.enableEnterIdleStateTimer();
          }

          // recognise storage actions
          this.recogniseStorageActions();
          break;
      }
    },

    /**
     * Get total space via the sum of the used space and free space.
     * @memberof ExternalStorageMonitor.prototype
     * @param {callback} function The callback will be run while get total space
     */
    getTotalSpace: function(callback) {
      var usedSpace, freeSpace;
      var self = this;
      this._storage.usedSpace().onsuccess = function(e) {
        usedSpace = e.target.result;
        self._storage.freeSpace().onsuccess = function(e) {
          freeSpace = e.target.result;
          var totalSpace = self.formatSize(usedSpace + freeSpace);
          if (callback) {
            callback(totalSpace);
          }
        };
      };
    },

    /**
     * Helper function to format the value returned by the
     * nsIDOMDeviceStorage.freeSpace call in a more readable way.
     * @memberof ExternalStorageMonitor.prototype
     * @param {size} bytes The size of specific storage space
     */
    formatSize: function(size) {
      if (size === undefined || isNaN(size)) {
        return;
      }

      var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      var i = 0;
      while (size >= 1024 && i < (units.length) - 1) {
        size /= 1024;
        ++i;
      }

      var sizeDecimal = i < 2 ? Math.round(size) : Math.round(size * 10) / 10;
      var _ = navigator.mozL10n.get;

      return {
        size: sizeDecimal,
        unit: _('byteUnit-' + units[i])
      };
    },

    /**
     * On/Off flag for enable debug message.
     * @memberof ExternalStorageMonitor.prototype
     */
    _debug: false,

    /**
     * Dump console log for debug message.
     * @memberof ExternalStorageMonitor.prototype
     * @param {string} str The error message for debugging.
     */
    debug: function(msg) {
      if (this._debug) {
        console.log(msg);
      }
    }
  };

  exports.ExternalStorageMonitor = ExternalStorageMonitor;

}(window));
