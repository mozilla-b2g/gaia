'use strict';
/* exported showFileInformation */
/* global
  $,
  getCurrentFile,
  MediaUtils,
  NFC,
  videostorage
*/

// Hide the information view again, when clicking on cancel
$('info-close-button').onclick = function hideFileInformation() {
  // Enable NFC sharing when user closes info and returns to fullscreen view
  NFC.share(getCurrentFile);
  $('info-view').classList.add('hidden');
  document.body.classList.remove('showing-dialog');
};

function showFileInformation(fileinfo) {
  if (fileinfo.metadata.video) {
    var req = videostorage.get(fileinfo.metadata.video);
    req.onsuccess = function() {
      fileinfo.size = req.result.size;
      fileinfo.type = req.result.type || 'video/3gp';
      populateMediaInfo(fileinfo);
    };
  } else {
    populateMediaInfo(fileinfo);
  }
  // We need to disable NFC sharing when showing file info view
  NFC.unshare();
  $('info-view').classList.remove('hidden');
  document.body.classList.add('showing-dialog');

  function populateMediaInfo(fileinfo) {
    var data = {
      //set the video filename using metadata
      'info-name': getFileName(fileinfo.metadata.video || fileinfo.name),
      'info-size': MediaUtils.formatSize(fileinfo.size),
      'info-type': fileinfo.type,
      'info-date': MediaUtils.formatDate(fileinfo.date),
      'info-resolution':
        fileinfo.metadata.width + 'x' + fileinfo.metadata.height
    };

    // Populate info overlay view
    MediaUtils.populateMediaInfo(data);
  }

  function getFileName(path) {
    return path.split('/').pop();
  }
}
