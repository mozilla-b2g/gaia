'use strict';

var Downloads = function Downloads() {

  var deleteButton, statusButton;

  var download = null;

  var init = function init() {
    deleteButton = document.getElementById('downloadDelete');
    deleteButton.addEventListener('click', onDelete);
    statusButton = document.getElementById('downloadStatus');
    statusButton.addEventListener('click', onStatus);

    listen();
  };

  var onDelete = function onDelete(evt) {
    LazyLoader.load(['/shared/js/download/download_helper.js'],
      function helperLoaded() {
        var request = DownloadHelper.remove(download);
        request.onsuccess = function() {
          alert('Download removed succesfully');
          download = null;
          deleteButton.disabled = true;
          statusButton.disabled = true;
        };

        request.onerror = function(msg) {
          alert('Error : ' + msg.message);
        };
      }
    );
  };

  var onStatus = function onStatus(evt) {
    if (download === null) {
      alert('No download initiated');
    } else {
      var msg = 'Current download:\n';
      msg += 'Total bytes: ' + download.totalBytes + '\n';
      msg += 'Current bytes: ' + download.currentBytes + '\n';
      msg += 'Url: ' + download.url + '\n';
      msg += 'Path: ' + download.path + '\n';
      try {
        msg += 'Start time: ' + download.startTime + '\n';
      } catch (e) {
        msg += 'Start: unknown\n';
      }
      msg += 'Id: ' + download.id + '\n';
      alert('Current download: ' + JSON.stringify(msg));
      console.log(msg);
    }
  };

  var listen = function listen() {
    navigator.mozDownloadManager.ondownloadstart = downloadStartedListener;
  };

  var downloadStartedListener = function downloadStartedListener(evt) {
    download = evt.download;
    download.onstatechange = downloadChangeListener;

    statusButton.disabled = false;
    statusButton.textContent = 'Status: ' + download.state;
    //console.log('State new download: ' + download.state);
  };

  var downloadChangeListener = function downloadChangeListener(evt) {
    statusButton.textContent = 'Status: ' + download.state;
    console.log('State change: ' + download.state);

    if (download.state === 'succeeded') {
      console.log('Download finished');
      deleteButton.disabled = false;
    }
  };

  return {
    'init': init
  };
}();

window.addEventListener('load', Downloads.init.bind(Downloads));
