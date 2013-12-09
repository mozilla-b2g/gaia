// Hide the information view again, when clicking on cancel
$('info-close-button').onclick = function hideFileInformation() {
  $('info-view').classList.add('hidden');
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

  $('info-view').classList.remove('hidden');

  function populateMediaInfo(fileinfo) {
    var data = {
      'info-name': getFileName(fileinfo.name),
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
