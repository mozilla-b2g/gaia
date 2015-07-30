/* global BaseIcon */
'use strict';

(function(exports) {
  var DownloadIcon = function(manager) {
    this.systemDownloads = {};
    this.downloadsCount = 0;
    BaseIcon.call(this, manager);
  };
  DownloadIcon.prototype = Object.create(BaseIcon.prototype);
  DownloadIcon.prototype.name = 'DownloadIcon';
  DownloadIcon.prototype.handle = function(download) {
    // New download, track it so we can show or hide the active downloads
    // indicator. If you think this logic needs to change, think really hard
    // about it and then come and ask @nullaus
    download.onstatechange = function(downloadEvent) {
      var download = downloadEvent.download;
      switch (download.state) {
        case 'downloading':
          // If this download has not already been tracked as actively
          // downloading we'll add it to our list and increment the
          // downloads counter.
          if (!this.systemDownloads[download.id]) {
            this.incDownloads();
            this.systemDownloads[download.id] = true;
          }
          break;
        // Once the download is finalized, and only then, is it safe to
        // remove our state change listener. If we remove it before then
        // we are likely to miss paused or errored downloads being restarted
        case 'finalized':
          download.onstatechange = null;
          this.update();
          break;
        // All other state changes indicate the download is no longer
        // active, if we were previously tracking the download as active
        // we'll decrement the counter now and remove it from active
        // download status.
        case 'stopped':
        case 'succeeded':
          if (this.systemDownloads[download.id]) {
            this.decDownloads();
            delete this.systemDownloads[download.id];
          }
          break;
        default:
          console.warn('Unexpected download state = ', download.state);
      }
    }.bind(this);
  };
  DownloadIcon.prototype.incDownloads = function() {
    this.downloadsCount++;
    this.update();
  };
  DownloadIcon.prototype.decDownloads = function() {
    if (--this.downloadsCount < 0) {
      this.downloadsCount = 0;
    }
    this.update();
  };
  DownloadIcon.prototype.shouldDisplay = function() {
    return this.downloadsCount !== 0;
  };

  DownloadIcon.prototype.view = function view() {
    return `<!-- See note on <img> above. -->
              <img id="statusbar-download"
              src="style/statusbar/images/system-downloads.png"
              class="sb-icon-download" hidden role="listitem"
              data-l10n-id="statusbarDownload">`;
  };

  exports.DownloadIcon = DownloadIcon;
}(window));
