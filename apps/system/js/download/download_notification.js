
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

  NotificationScreen.addNotification(this._getInfo());

  // We have to listen for state changes
  this.download.onstatechange = this._update.bind(this);
}

DownloadNotification.prototype = {

  /**
   * This method knows when the toaster should be displayed. Basically
   * the toaster shouldn't be displayed if the download state does not change
   * or the download was stopped by the user
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
   * This method is in charge of incrementing/decrementing the system downloads
   * according to previous and current states
   */
  _updateSystemDownloads: function dn_updateSystemDownloads() {
    var prevState = this.state;
    var newState = this.download.state;
    if (prevState !== newState) {
      if (newState === 'downloading') {
        StatusBar.incSystemDownloads();
      } else if (prevState === 'downloading') {
        StatusBar.decSystemDownloads();
      }
    }
  },

  /**
   * It updates the notification when the download state changes.
   */
  _update: function dn_update() {
    this._updateSystemDownloads();
    if (this.download.state === 'finalized') {
      this._onFinalized();
      return;
    }
    var noNotify = this._wontNotify();
    this.state = this.download.state;
    // Error attr will be not null when a download is stopped because
    // something failed
    if (this.download.state === 'stopped' && this.download.error !== null) {
      this.state = 'failed';
    }
    var info = this._getInfo();
    if (noNotify) {
      info.noNotify = true;
    }
    NotificationScreen.addNotification(info);
    if (this.state === 'succeeded') {
      this._onSucceeded();
    }
  },

  _onSucceeded: function dn_onSucceeded() {
    this._storeDownload(this.download);
  },

  _onFinalized: function dn_onFinalized() {
    this._close();
  },

  /**
   * This method stores complete downloads to share them with the download list
   * in settings app
   *
   * @param {Object} The download object provided by the API.
   */
  _storeDownload: function dn_storeDownload(download) {
    var req = DownloadStore.add(download);

    req.onsuccess = function _storeDownloadOnSuccess() {
      console.info('The download', download.id, 'was stored successfully:',
                    download.url);
    };

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
    var state = this.state;
    return state === 'stopped' ? null : this._ICONS_PATH + state +
                                        this._ICONS_EXTENSION;
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

    switch (this.download.state) {
      case 'downloading':
        // Launching settings > download list
        var activity = new MozActivity({
          name: 'configure',
          data: {
            target: 'device',
            section: 'downloads'
          }
        });

        // The notification won't be removed when users open the download list
        // activity.onsuccess = activity.onerror = cb;

        break;

      case 'stopped':
        // Prompts the user if he wishes to retry the download
        var req = DownloadUI.show(null, this.download, true);

        // The notification won't be removed when users decline to resume
        // req.oncancel = cb;

        req.onconfirm = this.download.resume.bind(this.download);

        break;

      case 'succeeded':
        // Attempts to open the file
        var download = this.download;
        var req = DownloadHelper.launch(download);

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
