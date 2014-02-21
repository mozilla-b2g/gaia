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
    if(!fileinfo.metadata.video) {
      document.getElementById('info-duration').style.display = "none";
      document.getElementById('vid-duration').style.display = "none";
    }
    else {
      document.getElementById('info-duration').style.display = "block";
      document.getElementById('vid-duration').style.display = "block";
      document.getElementById('info-duration').style.visibility = 'visible';
      document.getElementById('vid-duration').style.visibility = 'visible';
    }

    var data = {
      //set the video filename using metadata
      'info-name': getFileName(fileinfo.metadata.video || fileinfo.name),
      'info-size': MediaUtils.formatSize(fileinfo.size),
      'info-type': fileinfo.type,
      'info-date': MediaUtils.formatDate(fileinfo.date),
      'info-duration' : MediaUtils.formatDuration(fileinfo.metadata.duration),
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
