/* global System, BaseUI */
'use strict';

(function(exports) {
  var DownloadIcon = function(manager) {
    this.manager = manager;
    this.downloadManager = navigator.mozDownloadManager;
  };
  DownloadIcon.prototype = Object.create(BaseUI.prototype);
  DownloadIcon.prototype.constructor = DownloadIcon;
  DownloadIcon.prototype.EVENT_PREFIX = 'DownloadIcon';
  DownloadIcon.prototype.containerElement = document.getElementById('statusbar');
  DownloadIcon.prototype.view = function() {
    return '<img id="statusbar-system-downloads" ' +
            'src="style/statusbar/images/system-downloads.png" ' +
            'class="sb-icon-system-downloads" hidden role="listitem" ' +
            'data-l10n-id="statusbarDownloads">';
  };
  DownloadIcon.prototype.instanceID = 'statusbar-system-downloads';
  DownloadIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  DownloadIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  DownloadIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  DownloadIcon.prototype.start = function() {
    this.systemDownloadsCount = 0;
    this.systemDownloads = {};
    // Track Downloads via the Downloads API.
    this.downloadManager.addEventListener('downloadstart', this);
  };
  DownloadIcon.prototype.stop = function() {
    this.downloadManager.removeEventListener('downloadstart', this);
  };
  DownloadIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  DownloadIcon.prototype.handleEvent = function(evt) {
    // New download, track it so we can show or hide the active downloads
    // indicator. If you think this logic needs to change, think really hard
    // about it and then come and ask @nullaus
    evt.download.onstatechange = function(downloadEvent) {
      var download = downloadEvent.download;
      switch(download.state) {
        case 'downloading':
          // If this download has not already been tracked as actively
          // downloading we'll add it to our list and increment the
          // downloads counter.
          if (!this.systemDownloads[download.id]) {
            this.incSystemDownloads();
            this.systemDownloads[download.id] = true;
          }
          break;
        // Once the download is finalized, and only then, is it safe to
        // remove our state change listener. If we remove it before then
        // we are likely to miss paused or errored downloads being restarted
        case 'finalized':
          download.onstatechange = null;
          break;
        // All other state changes indicate the download is no longer
        // active, if we were previously tracking the download as active
        // we'll decrement the counter now and remove it from active
        // download status.
        case 'stopped':
        case 'succeeded':
          if (this.systemDownloads[download.id]) {
            this.decSystemDownloads();
            delete this.systemDownloads[download.id];
          }
          break;
        default:
          console.warn('Unexpected download state = ', download.state);
      }
    }.bind(this);
  };
  DownloadIcon.prototype.incSystemDownloads = function() {
    this.systemDownloadsCount++;
    this.update();
  };
  DownloadIcon.prototype.decSystemDownloads = function() {
    if (--this.systemDownloadsCount < 0) {
      this.systemDownloadsCount = 0;
    }
    this.update();
  };
  DownloadIcon.prototype.update = function() {
    var icon = this.element;
    this.systemDownloadsCount === 0 ? this.hide() : this.show();
    this.manager._updateIconVisibility();
  };
  exports.DownloadIcon = DownloadIcon;
}(window));
