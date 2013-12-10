/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * This file is in charge of rendering & update the list of downloads.
 */

'use strict';

(function(exports) {

  // Panels
  var downloadsContainer = null;
  var emptyDownloadsContainer = null;
  var downloadsPanel = null;

  // Buttons
  var editButton = null;
  var closeButton = null;
  var deleteButton = null;
  var selectAllButton = null;
  var deselectAllButton = null;

  // Not related with DOM vars
  var isEditMode = false;

  function _checkEmptyList() {
    if (!downloadsContainer) {
      return;
    }
    var isEmpty = (downloadsContainer.children.length === 0);

    downloadsContainer.className = isEmpty ? 'hide' : '';
    emptyDownloadsContainer.className = isEmpty ? '' : 'hide';
    editButton.className = isEmpty ? 'disabled' : '';
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
    if (isEditMode) {
      return;
    }
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

  // Methods for controlling the edit mode

  function _getAllChecks() {
    return downloadsContainer.querySelectorAll('input');
  }

  function _getAllChecked() {
    return downloadsContainer.querySelectorAll('input:checked');
  }

  function _markAllChecksAs(condition) {
    var checks = _getAllChecks();
    for (var i = 0; i < checks.length; i++) {
      checks[i].checked = condition;
    }
  }

  function _enableAllChecks() {
    _markAllChecksAs(true);
    _updateButtonsStatus();
  }

  function _disableAllChecks() {
    _markAllChecksAs(false);
    _updateButtonsStatus();
  }

  function _updateButtonsStatus() {
    if (_getAllChecked().length === 0) {
      document.getElementById('downloads-edit-deselect-all').disabled = true;
      deleteButton.disabled = true;
    } else {
      document.getElementById('downloads-edit-deselect-all').disabled = false;
      deleteButton.disabled = false;
    }

    if (_getAllChecks().length === _getAllChecked().length) {
      document.getElementById('downloads-edit-select-all').disabled = true;
    } else {
      document.getElementById('downloads-edit-select-all').disabled = false;
    }
  }


  function _onDownloadSelected(event) {
    if (isEditMode && event.target.tagName === 'INPUT') {
      _updateButtonsStatus();
    }
  }

  function _deleteDownloads() {
    var downloadsChecked = _getAllChecked();

    var downloadIDs = [], downloadElements = [];
    for (var i = 0; i < downloadsChecked.length; i++) {
      downloadIDs.push(downloadsChecked[i].value);
      downloadElements.push(downloadsChecked[i].parentNode.parentNode);
    }

    function deletionDone() {
      _checkEmptyList();
      _closeEditMode();
    }

    DownloadApiManager.deleteDownloads(
      downloadIDs,
      function downloadsDeleted() {
        _removeDownloadsFromUI(downloadElements);
        deletionDone();
      },
      function onError() {
        deletionDone();
      }
    );
  }

  function _removeDownloadsFromUI(elements) {
    for (var i = 0; i < elements.length; i++) {
      downloadsContainer.removeChild(elements[i]);
    }
  }

  function _loadEditMode() {
    // Disable all checks
    _disableAllChecks();
    // Ensure that header is the firstchild for using building blocks
    var targetHeader = document.getElementById('edit-mode-header');
    targetHeader.parentNode.insertBefore(
      targetHeader,
      targetHeader.parentNode.firstChild
    );
    // Add 'edit' stype
    downloadsPanel.classList.add('edit');
    // Change edit mdoe status
    isEditMode = true;
  }

  function _closeEditMode() {
    var targetHeader = document.getElementById('downloads-header');
    targetHeader.parentNode.insertBefore(
      targetHeader,
      targetHeader.parentNode.firstChild
    );
    downloadsPanel.classList.remove('edit');

    isEditMode = false;
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

      if (!navigator.mozDownloadManager) {
        scripts.push('js/downloads/desktop/desktop_moz_downloads.js');
      }

      LazyLoader.load(scripts, function onload() {
        // Cache DOM Elements
        // Panels
        downloadsContainer = document.querySelector('#downloadList ul');
        emptyDownloadsContainer =
          document.getElementById('download-list-empty');
        downloadsPanel = document.getElementById('downloads');
        // Buttons
        editButton = document.getElementById('downloads-edit-button');
        closeButton = document.getElementById('downloads-close-button');
        deleteButton = document.getElementById('downloads-delete-button');
        selectAllButton =
          document.getElementById('downloads-edit-select-all');
        deselectAllButton =
          document.getElementById('downloads-edit-deselect-all');

        // Localization of the nodes for avoiding weird repaintings
        var noDownloadsTextEl = document.getElementById('dle-text');
        var editModeTitle = document.getElementById('downloads-title-edit');

        navigator.mozL10n.localize(noDownloadsTextEl, 'no-downloads');
        navigator.mozL10n.localize(selectAllButton, 'downloads-select-all');
        navigator.mozL10n.localize(deselectAllButton, 'downloads-deselect-all');
        navigator.mozL10n.localize(editModeTitle, 'downloads-edit');
        navigator.mozL10n.localize(deleteButton, 'downloads-delete');

        // Render the entire list
        DownloadApiManager.getDownloads(
          _render.bind(this),
          _onerror.bind(this),
          oncomplete
        );

        // Update method added
        DownloadApiManager.setOnDownloadHandler(_prepend);

        // Add listener to edit mode
        editButton.addEventListener('click', _loadEditMode.bind(this));
        closeButton.addEventListener('click', _closeEditMode.bind(this));
        selectAllButton.addEventListener('click', _enableAllChecks.bind(this));
        deselectAllButton.addEventListener('click',
          _disableAllChecks.bind(this));
        deleteButton.addEventListener('click', _deleteDownloads.bind(this));
        downloadsContainer.addEventListener('click',
          _onDownloadSelected.bind(this));
      });
    }
  };

  exports.DownloadsList = DownloadsList;

}(this));

// startup
navigator.mozL10n.ready(DownloadsList.init.bind(DownloadsList));

