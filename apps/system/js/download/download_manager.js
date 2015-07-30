/* global LazyLoader, DownloadFormatter, DownloadNotification, DownloadIcon,
          Service */
'use strict';

/*
 * The DownloadManager listens for new downloads when they start. This
 * component will create notifications in the utility tray and will store them
 * Also it will create an icon in statusbar
 *
 * WARNING: This library will load these resources:
 *
 * - style/notifications/downloads.css
 * - shared/js/download/download_formatter.js
 * - js/download/download_notification.js
 */
 /* exported DownloadManager */
var DownloadManager = (function() {

  var mozDownloadManager = navigator.mozDownloadManager;

  if (!mozDownloadManager) {
    console.error('navigator.mozDownloadManager not supported!');
    return;
  }

  // XXX bug 1097435 -- This is the only safe place we can call this for now.
  mozDownloadManager.clearAllDone();

  // This object stores download notification objects by id
  var notifications = {};
  var started = false;
  var icon = null;

  // Define and set our download start handler.
  function onDownloadStart(ev) {
    if (started) {
      createDownloadNotificationAndIcon(ev.download);
    } else {
      LazyLoader.load(['shared/js/download/download_formatter.js',
                       'shared/js/download/download_ui.js',
                       'shared/js/download/download_store.js',
                       'shared/js/download/download_helper.js',
                       'js/download/download_notification.js']).then(
        function() {
          started = true;
          createDownloadNotificationAndIcon(ev.download);
          window.addEventListener('notification-clicked', handleEvent);

          // Bug 1102810 - After this bug gets fixed, this listener won't be
          // needed anymore. The API itself should handle startTime when killing
          // the process.
          window.addEventListener('will-shutdown', function onShutdown() {
            ev.download.pause();
          });
        })['catch'](function(err) { // XXX: workaround gjslint
          console.error(err);
        });
    }
  }
  mozDownloadManager.addEventListener('downloadstart', onDownloadStart);

  function createDownloadNotificationAndIcon(download) {
    var id = DownloadFormatter.getUUID(download);
    notifications[id] = new DownloadNotification(download);
    loadDownloadIconIfNecessary().then(function() {
      icon.handle(download);
    });
  }

  var downloadManager = {
    name: 'DownloadManager',
    incDownloads: function() {
      loadDownloadIconIfNecessary().then(function() {
        icon.incDownloads();
      })['catch'](function(err) { // XXX: workaround gjslint
        console.error(err);
      });
    },
    decDownloads: function() {
      loadDownloadIconIfNecessary().then(function() {
        icon.decDownloads();
      })['catch'](function(err) { // XXX: workaround gjslint
        console.error(err);
      });
    }
  };

  function loadDownloadIconIfNecessary() {
    return new Promise(function(resolve, reject) {
      if (!icon) {
        LazyLoader.load(['js/download_icon.js']).then(function() {
          icon = new DownloadIcon(this);
          icon.start();
          resolve();
        }.bind(this))['catch'](function(err) { // XXX: workaround gjslint
          console.error(err);
          reject();
        });
      } else {
        resolve();
      }
    });
  }

  Service.register('incDownloads', downloadManager);
  Service.register('decDownloads', downloadManager);

  function handleEvent(evt) {
    var detail = evt.detail;

    if (!detail || !detail.id) {
      return;
    }

    var id = detail.id;
    var notification = notifications[id];

    if (notification) {
      notification.onClick(function onRemovedNotification() {
        notifications[id] = null;
      });
    }
  }
}());
