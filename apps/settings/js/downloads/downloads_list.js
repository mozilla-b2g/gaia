/* global DownloadItem, DownloadUI, DownloadApiManager, DownloadsList,
          LazyLoader, DownloadHelper */
/*
 * This file is in charge of rendering & update the list of downloads.
 */

'use strict';

(function(exports) {

  // Panels
  var downloadsContainer = null;
  var emptyDownloadsContainer = null;
  var downloadsPanel = null;

  // Menus
  var downloadsEditMenu = null;

  // Buttons
  var editButton = null;
  var editHeader = null;
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

    editButton.disabled = isEmpty;
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

    if (!downloads || downloads.length === 0) {
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
    // We don't care about finalized as a state change. The DownloadList and
    // DownloadItem are not designed to consume this state change.
    if (download.state === 'finalized') {
      return;
    }
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
      case 'finalized':
      case 'succeeded':
        // launch an app to view the download
        _showDownloadActions(download);
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
  }

  function _showDownloadActions(download) {

    var actionReq = DownloadUI.showActions(download);

    actionReq.onconfirm = function(evt) {
      var req = DownloadHelper[actionReq.result.name](download);

      req.onerror = function() {
        DownloadHelper.handlerError(req.error, download, function removed(d) {
          if (!d) {
            return;
          }
          // If error when opening, we need to delete it!
          var downloadId = DownloadItem.getDownloadId(d);
          var elementToDelete = _getElementForId(downloadId);
          DownloadApiManager.deleteDownloads(
            [{
              id: downloadId,
              force: true // deleting download without confirmation
            }],
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
    };
  }

  // Methods for controlling the edit mode

  function _getAllChecks() {
    return downloadsContainer.querySelectorAll('gaia-checkbox');
  }

  function _getAllChecked() {
    return [].filter.call(_getAllChecks(), el => {
      return el.checked;
    });
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
    deleteButton.disabled = (numberOfCheckedDownloads <= 0);

    // "Select all" button status
    selectAllButton.disabled = (numberOfCheckedDownloads === numberOfDownloads);
    // Nothing checked?
    deselectAllButton.disabled = (numberOfCheckedDownloads === 0);
  }


  function _onDownloadSelected(event) {
    if (isEditMode && event.target.tagName === 'LI') {
      var input = event.target.querySelector('gaia-checkbox');
      if (typeof input === 'undefined') {
        return;
      }
      var checked = input.checked = !input.checked;
      checked ? numberOfCheckedDownloads++ : numberOfCheckedDownloads--;
      _updateButtonsStatus();
    }
  }

  function _deleteDownloads() {
    var downloadsChecked = _getAllChecked() || [];
    var downloadItems = [], downloadElements = {};
    var downloadList = [];
    var total = downloadsChecked.length;
    var multipleDelete = total > 1;
    for (var i = 0; i < total; i++) {
      downloadItems.push({
        id: downloadsChecked[i].value,
        force: multipleDelete
      });
      downloadElements[downloadsChecked[i].value] =
        downloadsChecked[i].parentNode;
      if (multipleDelete) {
        downloadList.push(downloadElements[downloadsChecked[i].value]);
      }
    }

    function deletionDone() {
      _checkEmptyList();
      _closeEditMode();
    }

    function doDeleteDownloads() {
      DownloadApiManager.deleteDownloads(
        downloadItems,
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

    if (multipleDelete) {
      var req = DownloadUI.show(DownloadUI.TYPE.DELETE_ALL, downloadList);
      req.onconfirm = doDeleteDownloads;
      req.oncancel = deletionDone;
    } else {
      doDeleteDownloads();
    }
  }

  function _removeDownloadsFromUI(elements) {
    for (var i = 0; i < elements.length; i++) {
      downloadsContainer.removeChild(elements[i]);
    }
  }

  function _loadEditMode() {
    // Disable all checks
    _disableAllChecks();

    // Add 'edit' stype
    downloadsPanel.classList.add('edit');

    downloadsEditMenu.hidden = false;

    // Change edit mdoe status
    isEditMode = true;
    _updateButtonsStatus();
  }

  function _closeEditMode() {
    // Remove "edit" styles
    downloadsPanel.classList.remove('edit');

    downloadsEditMenu.hidden = true;

    // Clean vars
    isEditMode = false;
    numberOfDownloads = 0;
    numberOfCheckedDownloads = 0;
  }

  function _downloadApiManagerListener(changeEvent) {
    switch (changeEvent.type) {
      case 'added':
        // First we'll try and find an existing item with the download api id.
        var element = null;
        if (changeEvent.downloadApiId &&
            (element = _getElementForId(changeEvent.downloadApiId))) {
          // If we find one, we'll want to update it's id before updating the
          // content.
          DownloadItem.updateDownloadId(changeEvent.download, element);
        }
        else if ((element = _getElementForId(changeEvent.download.id))) {
          // Secondly, try and find it by it's download id.
          _update(changeEvent.download);
        }
        else {
          // Lastly, if we didn't find it by downloadApiId or id, it's truly
          // new to the user so we need to add it to the download list.
          _newDownload(changeEvent.download);
        }
        break;
    }
  }

  var DownloadsList = {
    init: function(oncomplete) {
      var scripts = [
        'shared/js/download/download_store.js', // Must be loaded first.
        'shared/js/download/download_ui.js',
        'shared/js/mime_mapper.js',
        'shared/js/download/download_helper.js',
        'shared/js/download/download_formatter.js',
        'js/downloads/download_api_manager.js',
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
        // Menus
        downloadsEditMenu = document.getElementById('downloads-edit-menu');
        // Buttons
        editButton = document.getElementById('downloads-edit-button');
        editHeader = document.getElementById('downloads-edit-header');
        deleteButton = document.getElementById('downloads-delete-button');
        selectAllButton =
          document.getElementById('downloads-edit-select-all');
        deselectAllButton =
          document.getElementById('downloads-edit-deselect-all');

        // Initialize the Api Manager and set our listener.
        DownloadApiManager.init();
        DownloadApiManager.setListener(_downloadApiManagerListener.bind(this));

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
        editHeader.addEventListener('action', _closeEditMode.bind(this));
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

}(window));

// startup
navigator.mozL10n.once(DownloadsList.init.bind(DownloadsList));

