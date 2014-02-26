
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

  // This object stores download notification objects by id
  var notifications = {};
  var started = false;

  // Clear all previously completed downloads from the Downloads API
  // We don't need those in there anymore since we're tracking everything
  // in our own datastore (see download_store.js).
  mozDownloadManager.clearAllDone();

  // Set our download start handler.
  mozDownloadManager.ondownloadstart = function onDownloadStart(ev) {
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
      });
    }
  };

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
