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
    MediaUtils.getLocalizedSizeTokens(fileinfo.size).then((args) => {
      var data = {
        //set the video filename using metadata
        'info-name': {
          raw: getFileName(fileinfo.metadata.video || fileinfo.name)
        },
        'info-size': {
          id: 'fileSize',
          args: args
        },
        'info-type': {raw: fileinfo.type},
        'info-date': {raw: MediaUtils.formatDate(fileinfo.date)},
        'info-resolution': {
          raw: fileinfo.metadata.width + 'x' + fileinfo.metadata.height
        }
      };

      // Populate info overlay view
      MediaUtils.populateMediaInfo(data);
      // Hide Resolution for video files. See Bug 1217989
      fileinfo.metadata.video ? setFieldVisibility('info-resolution', false) :
                                setFieldVisibility('info-resolution', true);

    });
  }

  function getFileName(path) {
    return path.split('/').pop();
  }

  function setFieldVisibility(id, visible) {
    // Field label in info view
    var label = $(id).previousElementSibling;

    // If not visible, hide respective field label and
    // its value and remove bottom border from the previous field.
    if (visible) {
      $(id).style.display = 'block';
      label.style.display = 'block';
      label.previousElementSibling.classList.remove('no-border');
    } else {
      $(id).style.display = 'none';
      label.style.display = 'none';
      if ($(id).nextElementSibling === null) {
        label.previousElementSibling.classList.add('no-border');
      }
    }
  }

}
