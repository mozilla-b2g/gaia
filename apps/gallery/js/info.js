// Hide the information view again, when clicking on cancel
$('info-close-button').onclick = function hideFileInformation() {
  // Enable NFC sharing when user closes info and returns to fullscreen view
  setNFCSharing(true);
  $('info-view').classList.add('hidden');
};

function showFileInformation(fileinfo) {
  if (fileinfo.metadata.video) {
    var req = videostorage.get(fileinfo.metadata.video);
    req.onsuccess = function() {
      fileinfo.size = req.result.size;
      fileinfo.type = req.result.type || 'video/3gp';
      // setting the name from original file
      fileinfo.name = req.result.name;
      populateMediaInfo(fileinfo);
    };
  } else {
    populateMediaInfo(fileinfo);
  }
  // We need to disable NFC sharing when showing file info view
  setNFCSharing(false);
  $('info-view').classList.remove('hidden');

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
