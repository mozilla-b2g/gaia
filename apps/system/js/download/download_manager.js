
'use strict';

/*
 * The DownloadManager listens for new downloads when they start. This
 * component will create notifications in the utility tray and will store them
 *
 * WARNING: This library will load these resources:
 *
 * - style/notifications/downloads.css
 * - shared/js/download/download_formatter.js
 * - js/download/download_notification.js
 */
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

  // Define and set our download start handler.
  function onDownloadStart(ev) {
    if (started) {
      createDownloadNotification(ev.download);
    } else {
      LazyLoader.load(['shared/js/download/download_formatter.js',
                       'shared/js/download/download_ui.js',
                       'shared/js/download/download_store.js',
                       'shared/js/download/download_helper.js',
                       'js/download/download_notification.js'], function() {
        started = true;
        createDownloadNotification(ev.download);
        window.addEventListener('notification-clicked', handleEvent);

        // Bug 1102810 - After this bug gets fixed, this listener won't be
        // needed anymore. The API itself should handle startTime when killing
        // the process.
        window.addEventListener('will-shutdown', function onShutdown() {
          ev.download.pause();
        });
      });
    }
  }
  mozDownloadManager.addEventListener('downloadstart', onDownloadStart);

  function createDownloadNotification(download) {
    var id = DownloadFormatter.getUUID(download);
    notifications[id] = new DownloadNotification(download);
  }

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
