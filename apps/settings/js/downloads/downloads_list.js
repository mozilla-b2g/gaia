/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * This file is in charge of rendering & update the list of downloads.
 */

'use strict';

(function(exports) {


  var downloadsContainer = null;
  var emptyDownloadsContainer = null;

  function _checkEmptyList() {
    if (!downloadsContainer) {
      return;
    }
    var isEmpty = (downloadsContainer.children.length === 0);

    downloadsContainer.className = isEmpty ? 'hide' : '';
    emptyDownloadsContainer.className = isEmpty ? '' : 'hide';
  }

  function _render(downloads, oncomplete) {
    if (!downloadsContainer) {
      return;
    }

    if (!downloads || downloads.length == 0) {
      _checkEmptyList();
      return;
    }
    // Clean before rendering
    downloadsContainer.innerHTML = '';
    // Render
    downloads.forEach(_append);

    oncomplete && oncomplete();
  }

  function _onerror() {
    // TODO Implement screen or error message
    console.error('Error while retrieving');
  }

  function _create(download) {
    var li = DownloadItem.create(download);
    if (download.state === 'downloading') {
      download.onstatechange = _onDownloadStateChange;
    }
    li.addEventListener('click', _onDownloadAction);
    return li;
  }

  function _prepend(download) {
    if (downloadsContainer.children.length === 0) {
      _append(download);
      _checkEmptyList();
      return;
    }

    downloadsContainer.insertBefore(
      _create(download),
      downloadsContainer.firstChild
    );
    _checkEmptyList();
  }

  function _append(download) {
    downloadsContainer.appendChild(_create(download));
    if (download.state === 'downloading') {
      download.onstatechange = _onDownloadStateChange;
    }
  }

  function _getElementForId(id) {
    return downloadsContainer.querySelector('[data-id="' + id + '"]');
  }

  function _update(download) {
    var id = DownloadItem.getDownloadId(download);
    var elementToUpdate = _getElementForId(id);
    if (!elementToUpdate) {
      console.error('Item to update not found');
      return;
    }
    DownloadItem.refresh(elementToUpdate, download);
    DownloadApiManager.updateDownload(download);
  }

  function _delete(id) {
    var elementToDelete = _getElementForId(id);
    if (!elementToDelete) {
      console.error('Item to delete not found');
      return;
    }
    downloadsContainer.removeChild(elementToDelete);
    _checkEmptyList();
  }

  function _onDownloadAction(event) {
    var downloadID = event.target.id || event.target.dataset.id;
    var download = DownloadApiManager.getDownload(downloadID);
    _actionHandler(download);
  }

  function _onDownloadStateChange(event) {
    var download = event.download;
    _update(download);
  }

  function _actionHandler(download) {
    if (!download) {
      console.error('Download not retrieved properly');
      return;
    }

    switch (download.state) {
      case 'downloading':
        // downloading -> paused
        _pauseDownload(download);
        break;
      case 'stopped':
        // paused -> downloading
        _restartDownload(download);
        break;
      case 'succeeded':
        // launch an app to view the download
        _launchDownload(download);
        break;
    }
  }

  function _pauseDownload(download) {
    var request = DownloadUI.show(DownloadUI.TYPE.STOP, download);

    request.onconfirm = function() {
      if (download.pause) {
        download.pause().then(function() {
          // Remove listener
          download.onstatechange = null;
          _update(download);
        }, function() {
          console.error('Could not pause the download');
        });
      }
    };

  }

  function _restartDownload(download) {
    var request = DownloadUI.show(DownloadUI.TYPE.STOPPED, download);

    function checkDownload() {
      download.onstatechange = _onDownloadStateChange;
      _update(download);
    }

    request.onconfirm = function() {
      if (download.resume) {
        download.resume().then(function() {
          checkDownload();
        }, function onError() {
          alert(navigator.mozL10n.get('restart_download_error'));
        });
      }
    };
  };

  function _launchDownload(download) {
    var req = DownloadHelper.launch(download);

    req.onerror = function() {
      DownloadHelper.handlerError(req.error, download, function removed(d) {
        if (!d) {
          return;
        }
        var downloadId = DownloadItem.getDownloadId(d);
        DownloadApiManager.deleteDownloads([downloadId],
          function removeFromUI() {
            _delete(downloadId);
          }
        );
      });
    };
  }

  var DownloadsList = {
    init: function(oncomplete) {
      var scripts = [
        'js/downloads/download_api_manager.js',
        'shared/js/download/download_store.js',
        'shared/js/download/download_ui.js',
        'shared/js/mime_mapper.js',
        'shared/js/download/download_helper.js',
        'shared/js/download/download_formatter.js',
        'js/downloads/download_item.js'
      ];

      LazyLoader.load(scripts, function onload() {
        // Init the container
        downloadsContainer = document.querySelector('#downloadList ul');
        emptyDownloadsContainer =
          document.getElementById('download-list-empty');
        var noDownloadsTextEl = document.getElementById('dle-text');
        navigator.mozL10n.localize(noDownloadsTextEl, 'no-downloads');
        // Render the entire list
        DownloadApiManager.getDownloads(
          _render.bind(this),
          _onerror.bind(this),
          oncomplete
        );
        // Update if needed
        DownloadApiManager.setOnDownloadHandler(_prepend);
      });
    }
  };

  exports.DownloadsList = DownloadsList;

}(this));

// startup
navigator.mozL10n.ready(DownloadsList.init.bind(DownloadsList));

