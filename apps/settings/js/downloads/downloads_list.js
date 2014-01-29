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
  var numberOfDownloads = 0;
  var numberOfCheckedDownloads = 0;

  function _checkEmptyList() {
    if (!downloadsContainer) {
      return;
    }
    var isEmpty = (downloadsContainer.children.length === 0);

    if (isEmpty) {
      downloadsContainer.hidden = true;
      emptyDownloadsContainer.hidden = false;
    } else {
      downloadsContainer.hidden = false;
      emptyDownloadsContainer.hidden = true;
    }

    editButton.className = isEmpty ? 'disabled' : '';
  }

  function _newDownload(download) {
    _prepend(download);
    if (isEditMode) {
      numberOfDownloads++;
      _updateButtonsStatus();
    }
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
          // We don't remove the listener because the download could be
          // restarted in notification tray
          _update(download);
        }, function() {
          console.error('Could not pause the download');
        });
      }
    };

  }

  function _restartDownload(download) {
    // DownloadUI knows which will be the correct confirm depending on state
    // and error attributes
    var request = DownloadUI.show(null, download);

    request.onconfirm = function() {
      if (download.resume) {
        download.resume().then(function() {
          // Nothing to do here -> this resolves only once the download has
          // succeeded.
        }, function onError() {
          // This error is fired when a download restarted is paused
          console.error(navigator.mozL10n.get('restart_download_error'));
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
        // If error when opening, we need to delete it!
        var downloadId = DownloadItem.getDownloadId(d);
        var elementToDelete = _getElementForId(downloadId);
        DownloadApiManager.deleteDownloads(
          [downloadId],
          function onDeleted() {
            _removeDownloadsFromUI([elementToDelete]);
            _checkEmptyList();
          },
          function onError() {
            console.warn('Download not removed during launching');
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
    numberOfCheckedDownloads = condition ? numberOfDownloads : 0;
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
    if (numberOfDownloads === 0) {
      // Cache number of downloads
      numberOfDownloads = _getAllChecks().length;
    }
    // Delete button status
    deleteButton.disabled = !(numberOfCheckedDownloads > 0);

    // "Select all" button status
    selectAllButton.disabled = (numberOfCheckedDownloads === numberOfDownloads);
    // Nothing checked?
    deselectAllButton.disabled = (numberOfCheckedDownloads === 0);
  }


  function _onDownloadSelected(event) {
    if (isEditMode && event.target.tagName === 'INPUT') {
      event.target.checked ?
        numberOfCheckedDownloads++ : numberOfCheckedDownloads--;
      _updateButtonsStatus();
    }
  }

  function _deleteDownloads() {
    var downloadsChecked = _getAllChecked() || [];
    var downloadIDs = [], downloadElements = {};
    for (var i = 0; i < downloadsChecked.length; i++) {
      downloadIDs.push(downloadsChecked[i].value);
      downloadElements[downloadsChecked[i].value] =
        downloadsChecked[i].parentNode.parentNode;
    }

    function deletionDone() {
      _checkEmptyList();
      _closeEditMode();
    }

    DownloadApiManager.deleteDownloads(
      downloadIDs,
      function downloadsDeleted(downloadID) {
        _removeDownloadsFromUI([downloadElements[downloadID]]);
      },
      function onError(downloadID, msg) {
        console.warn('Could not delete ' + downloadID + ' : ' + msg);
        deletionDone();
      },
      function onComplete() {
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
    _updateButtonsStatus();
  }

  function _closeEditMode() {
    // Ensure the header
    var targetHeader = document.getElementById('downloads-header');
    targetHeader.parentNode.insertBefore(
      targetHeader,
      targetHeader.parentNode.firstChild
    );
    // Remove "edit" styles
    downloadsPanel.classList.remove('edit');
    // Clean vars
    isEditMode = false;
    numberOfDownloads = 0;
    numberOfCheckedDownloads = 0;
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

        // Render the entire list
        DownloadApiManager.getDownloads(
          _render.bind(this),
          _onerror.bind(this),
          oncomplete
        );

        // Update method added
        DownloadApiManager.setOnDownloadHandler(_newDownload);

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

