/* global DownloadFormatter, NotificationScreen, DownloadUI, DownloadHelper,
          MozActivity, DownloadStore */

'use strict';

/**
 * This is the constructor that will represent a download notification
 * in the system
 *
 * @param {Object} download object provided by the API.
 */
function DownloadNotification(download) {
  this.download = download;
  this.fileName = DownloadFormatter.getFileName(download);
  this.state = 'started';
  this.id = DownloadFormatter.getUUID(download);

  // We have to listen for state changes
  this.listener = this._update.bind(this);
  this.download.addEventListener('statechange', this.listener);

  if (download.state === 'started') {
    NotificationScreen.addNotification(this._getInfo());
  } else {
    // For adopted downloads, it is possible for the download to already be
    // completed.
    this._update();
  }
}

DownloadNotification.prototype = {

  /**
   * This method knows when the toaster should be displayed. Basically
   * the toaster shouldn't be displayed if the download state does not change
   * or the download was stopped by the user or because of connectivity lost
   *
   * @return {boolean} True whether the toaster should be displayed.
   */
  _wontNotify: function dn_wontNotify() {
    var download = this.download;
    return this.state === download.state ||
           download.state === 'downloading' ||
          (download.state === 'stopped' && download.error === null);
  },

  /**
   * It updates the notification when the download state changes.
   */
  _update: function dn_update() {
    if (this.download.state === 'finalized') {
      // If the user delete the file, we will see this state and what we have to
      // do, is to remove the notification
      this._close();
      return;
    }
    var noNotify = this._wontNotify();
    this.state = this.download.state;
    if (this.download.state === 'stopped') {
      this._onStopped();
    }
    var info = this._getInfo();
    if (noNotify) {
      info.noNotify = true;
    }
    if (this.state === 'downloading') {
      info.mozbehavior = {
        noscreen: true
      };
    }
    NotificationScreen.addNotification(info);
    if (this.state === 'succeeded') {
      this._onSucceeded();
    }
  },

  _onStopped: function dn_onStopped() {
    if (this.download.error !== null) {
      // Error attr will be not null when a download is stopped because
      // something failed
      this.state = 'failed';
      this._onError();
    } else if (!window.navigator.onLine) {
      // Remain downloading state when the connectivity was lost
      this.state = 'downloading';
    }
  },

  _onError: function dn_onError() {
    var result = parseInt(this.download.error.message);

    switch (result) {
      case DownloadUI.ERRORS.NO_MEMORY:
        DownloadUI.show(DownloadUI.TYPE.NO_MEMORY,
                        this.download,
                        true);
        break;
      case DownloadUI.ERRORS.NO_SDCARD:
        DownloadUI.show(DownloadUI.TYPE.NO_SDCARD,
                        this.download,
                        true);
        break;
      case DownloadUI.ERRORS.UNMOUNTED_SDCARD:
        DownloadUI.show(DownloadUI.TYPE.UNMOUNTED_SDCARD,
                        this.download,
                        true);
        break;

      default:
        DownloadHelper.getFreeSpace((function gotFreeMemory(bytes) {
          if (bytes === 0) {
            DownloadUI.show(DownloadUI.TYPE.NO_MEMORY, this.download, true);
          }
        }).bind(this));
    }
  },

  _onSucceeded: function dn_onSucceeded() {
    this._storeDownload(this.download);
  },

  /**
   * This method stores complete downloads to share them with the download list
   * in settings app
   *
   * @param {Object} The download object provided by the API.
   */
  _storeDownload: function dn_storeDownload(download) {
    var req = DownloadStore.add(download);

    req.onsuccess = (function _storeDownloadOnSuccess(request) {
      // We don't care about any more state changes to the download.
      this.download.removeEventListener('statechange', this.listener);
      // Update the download object to the datastore representation.
      this.download = req.result;
    }).bind(this);

    req.onerror = function _storeDownloadOnError(e) {
      console.error('Exception storing the download', download.id, '(',
                     download.url, ').', e.target.error);
    };
  },

  _ICONS_PATH: 'style/notifications/images/',

  _ICONS_EXTENSION: '.png',

  /**
   * It returns the icon depending on current state
   *
   * @return {String} Icon path.
   */
  _getIcon: function dn_getIcon() {
    var icon = (this.state === 'downloading' ? 'downloading' : 'download');
    return this._ICONS_PATH + icon + this._ICONS_EXTENSION;
  },

  /**
   * This method returns an object to update the notification composed by the
   * text, icon and type
   *
   * @return {object} Object descriptor.
   */
  _getInfo: function dn_getInfo() {
    var state = this.state;
    var _ = navigator.mozL10n.get;

    var info = {
      id: this.id,
      title: _('download_' + state),
      icon: this._getIcon(),
      type: 'download-notification-' + state
    };

    if (state === 'downloading') {
      info.text = _('download_downloading_text_2', {
        name: this.fileName,
        percentage: DownloadFormatter.getPercentage(this.download)
      });
    } else {
      info.text = _('download_text_by_default', {
        name: this.fileName
      });
    }

    return info;
  },

  /**
   * Closes the notification
   */
  _close: function dn_close() {
    NotificationScreen.removeNotification(this.id);
    this.onClose();
  },

  /**
   * It performs the action when the notification is clicked by the user
   * depending on state:
   *
   * - 'downloading' -> launch the download list
   * - 'stopped' -> show confirmation to resume the download
   * - 'finalized' -> show confirmation to retry the download
   * - 'succeeded' -> open the downloaded file
   *
   * @param {function} Function that will be invoked when the notification
   *                   is removed from utility tray.
   */
  onClick: function dn_onClick(done) {
    var cb = (function() {
      this._close();
      done();
    }).bind(this);

    var req;

    switch (this.download.state) {
      case 'downloading':
        // Launching settings > download list
        /* jshint nonew: false */
        new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'downloads'
          }
        });
        /* jshint nonew: true */

        // The notification won't be removed when users open the download list
        // activity.onsuccess = activity.onerror = cb;

        break;

      case 'stopped':
        // Prompts the user if he wishes to retry the download
        req = DownloadUI.show(null, this.download, true);

        // The notification won't be removed when users decline to resume
        // req.oncancel = cb;

        req.onconfirm = this.download.resume.bind(this.download);

        break;

      case 'succeeded':
        // Attempts to open the file
        var download = this.download;
        req = DownloadHelper.open(download);

        req.onerror = function req_onerror() {
          DownloadHelper.handlerError(req.error, download);
        };

        cb();

        break;
    }
  },

  /**
   * This method releases memory destroying the notification object
   */
  onClose: function dn_onClose() {
    this.download.onstatechange = this.download = this.id = this.state = null;
  }
};
