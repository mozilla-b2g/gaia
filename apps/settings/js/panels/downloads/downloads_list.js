/*
 * This file is in charge of rendering & update the list of downloads.
 */

'use strict';

define(function(require) {
  var MimeMapper = require('shared/mime_mapper'); // jshint ignore:line
  var DownloadUI = require('shared/download/download_ui');
  var DownloadHelper = require('shared/download/download_helper');
  var DownloadApiManager = require('panels/downloads/download_api_manager');
  var DownloadItem = require('panels/downloads/download_item');

  if (!navigator.mozDownloadManager) {
    navigator.mozDownloadManager =
      require('panels/downloads/desktop/desktop_moz_downloads');
  }

  var DownloadsList = function() {
    this.isEditMode = false;
    this.numberOfDownloads = 0;
    this.numberOfCheckedDownloads = 0;
  };

  DownloadsList.prototype = {
    _checkEmptyList: function d_checkEmptyList() {
      if (!this._elements.downloadsContainer) {
        return;
      }
      var isEmpty = (this._elements.downloadsContainer.children.length === 0);

      if (isEmpty) {
        this._elements.downloadsContainer.hidden = true;
        this._elements.emptyDownloadsContainer.hidden = false;
      } else {
        this._elements.downloadsContainer.hidden = false;
        this._elements.emptyDownloadsContainer.hidden = true;
      }

      this._elements.editButton.disabled = isEmpty;
    },

    _newDownload: function d_newDownload(download) {
      this._prepend(download).then(() => {
        if (this.isEditMode) {
          this.numberOfDownloads++;
          this._updateButtonsStatus();
        }
      });
    },

    _render: function d_render(downloads, oncomplete) {
      if (!this._elements.downloadsContainer) {
        return;
      }

      if (!downloads || downloads.length === 0) {
        this._checkEmptyList();
        return;
      }
      // Clean before rendering
      this._elements.downloadsContainer.innerHTML = '';
      // Render
      Promise.all(downloads.map(this._append.bind(this))).then(() => {
        oncomplete && oncomplete();
      });
    },

    _onerror: function d_onerror() {
      // TODO Implement screen or error message
      console.error('Error while retrieving');
    },

    _create: function d_create(download) {
      return DownloadItem.create(download).then((li) => {
        if (download.state === 'downloading') {
          download.onstatechange = this._onDownloadStateChange.bind(this);
        }
        li.addEventListener('click', this._onDownloadAction.bind(this));
        return li;
      });
    },

    _prepend: function d_prepend(download) {
      if (this._elements.downloadsContainer.children.length === 0) {
        return this._append(download).then(() => {
          this._checkEmptyList();
        });
      } else {
        return this._create(download).then((li) => {
          this._elements.downloadsContainer.insertBefore(
            li,
            this._elements.downloadsContainer.firstChild
          );
          this._checkEmptyList();
        });
      }
    },

    _append: function d_append(download) {
      return this._create(download).then((li) => {
        this._elements.downloadsContainer.appendChild(li);
      });
    },

    _getElementForId: function d_getElementForId(id) {
      return this._elements.downloadsContainer
        .querySelector('[data-id="' + id + '"]');
    },

    _update: function d_update(download) {
      var id = DownloadItem.getDownloadId(download);
      var elementToUpdate = this._getElementForId(id);
      if (!elementToUpdate) {
        console.error('Item to update not found');
        return;
      }
      DownloadItem.refresh(elementToUpdate, download);
      DownloadApiManager.updateDownload(download);
    },

    _onDownloadAction: function d_onDownloadAction(event) {
      if (this.isEditMode) {
        return;
      }
      var downloadID = event.target.id || event.target.dataset.id;
      var download = DownloadApiManager.getDownload(downloadID);
      this._actionHandler(download);
    },

    _onDownloadStateChange: function d_onDownloadStateChange(event) {
      var download = event.download;
      // We don't care about finalized as a state change. The DownloadList and
      // DownloadItem are not designed to consume this state change.
      if (download.state === 'finalized') {
        return;
      }
      this._update(download);
    },

    _actionHandler: function d_actionHandler(download) {
      if (!download) {
        console.error('Download not retrieved properly');
        return;
      }

      switch (download.state) {
        case 'downloading':
          // downloading -> paused
          this._pauseDownload(download);
          break;
        case 'stopped':
          // paused -> downloading
          this._restartDownload(download);
          break;
        case 'finalized':
        case 'succeeded':
          // launch an app to view the download
          this._showDownloadActions(download);
          break;
      }
    },

    _pauseDownload: function d_pauseDownload(download) {
      var request = DownloadUI.show(DownloadUI.TYPE.STOP, download);

      request.onconfirm = () => {
        if (download.pause) {
          download.pause().then(() => {
            // We don't remove the listener because the download could be
            // restarted in notification tray
            this._update(download);
          }, () => { // onError
            console.error('Could not pause the download');
          });
        }
      };
    },

    _restartDownload: function d_restartDownload(download) {
      // DownloadUI knows which will be the correct confirm depending on state
      // and error attributes
      var request = DownloadUI.show(null, download);

      request.onconfirm = () => {
        if (download.resume) {
          download.resume().then(() => {
            // Nothing to do here -> this resolves only once the download has
            // succeeded.
          }, () => { // onError
            // This error is fired when a download restarted is paused
            document.l10n.formatValue('restart_download_error').then(msg =>
              console.error(msg));
          });
        }
      };
    },

    _showDownloadActions: function d_showDownloadActions(download) {

      var actionReq = DownloadUI.showActions(download);

      actionReq.onconfirm = (evt) => {
        var req = DownloadHelper[actionReq.result.name](download);

        req.onerror = () => {
          DownloadHelper.handlerError(req.error, download, (d) => {
            if (!d) {
              return;
            }
            // If error when opening, we need to delete it!
            var downloadId = DownloadItem.getDownloadId(d);
            var elementToDelete = this._getElementForId(downloadId);
            DownloadApiManager.deleteDownloads(
              [{
                id: downloadId,
                force: true // deleting download without confirmation
              }],
              () => { // onDeleted
                this._removeDownloadsFromUI([elementToDelete]);
                this._checkEmptyList();
              },
              () => { // onError
                console.warn('Download not removed during launching');
              }
            );
          });
        };
      };
    },

    // Methods for controlling the edit mode

    _getAllChecks: function d_getAllChecks() {
      return this._elements.downloadsContainer
        .querySelectorAll('gaia-checkbox');
    },

    _getAllChecked: function d_getAllChecked() {
      return [].filter.call(this._getAllChecks(), el => {
        return el.checked;
      });
    },

    _markAllChecksAs: function d_markAllChecksAs(condition) {
      var checks = this._getAllChecks();
      for (var i = 0; i < checks.length; i++) {
        checks[i].checked = condition;
      }
      this.numberOfCheckedDownloads = condition ? this.numberOfDownloads : 0;
    },

    _enableAllChecks: function d_enableAllChecks() {
      this._markAllChecksAs(true);
      this._updateButtonsStatus();
    },

    _disableAllChecks: function d_disableAllChecks() {
      this._markAllChecksAs(false);
      this._updateButtonsStatus();
    },

    _updateButtonsStatus: function d_updateButtonsStatus() {
      if (this.numberOfDownloads === 0) {
        // Cache number of downloads
        this.numberOfDownloads = this._getAllChecks().length;
      }
      // Delete button status
      this._elements.deleteButton.disabled =
        (this.numberOfCheckedDownloads <= 0);

      // "Select all" button status
      this._elements.selectAllButton.disabled =
        (this.numberOfCheckedDownloads === this.numberOfDownloads);
      // Nothing checked?
      this._elements.deselectAllButton.disabled =
        (this.numberOfCheckedDownloads === 0);
    },

    _onDownloadSelected: function d_onDownloadSelected(event) {
      if (this.isEditMode && event.target.tagName === 'LI') {
        var input = event.target.querySelector('gaia-checkbox');
        if (typeof input === 'undefined') {
          return;
        }
        var checked = input.checked = !input.checked;
        checked ? this.numberOfCheckedDownloads++
          : this.numberOfCheckedDownloads--;
        this._updateButtonsStatus();
      }
    },

    _deleteDownloads: function d_deleteDownloads() {
      var downloadsChecked = this._getAllChecked() || [];
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

      var deletionDone = function() {
        this._checkEmptyList();
        this._closeEditMode();
      };

      var doDeleteDownloads = function() {
        DownloadApiManager.deleteDownloads(
          downloadItems,
          (downloadID) => { // downloadsDeleted
            this._removeDownloadsFromUI([downloadElements[downloadID]]);
          },
          (downloadID, msg) => { // onError
            console.warn('Could not delete ' + downloadID + ' : ' + msg);
            deletionDone.call(this);
          },
          () => { // onComplete
            deletionDone.call(this);
          }
        );
      };

      if (multipleDelete) {
        var req = DownloadUI.show(DownloadUI.TYPE.DELETE_ALL, downloadList);
        req.onconfirm = doDeleteDownloads.bind(this);
        req.oncancel = deletionDone.bind(this);
      } else {
        doDeleteDownloads.call(this);
      }
    },

    _removeDownloadsFromUI: function d_removeDownloadsFromUI(elements) {
      for (var i = 0; i < elements.length; i++) {
        this._elements.downloadsContainer.removeChild(elements[i]);
      }
    },

    _loadEditMode: function d_loadEditMode() {
      // Disable all checks
      this._disableAllChecks();

      // Add 'edit' stype
      this._elements.downloadsPanel.classList.add('edit');

      this._elements.downloadsEditMenu.hidden = false;

      // Change edit mdoe status
      this.isEditMode = true;
      this._updateButtonsStatus();
    },

    _closeEditMode: function d_closeEditMode() {
      // Remove "edit" styles
      this._elements.downloadsPanel.classList.remove('edit');

      this._elements.downloadsEditMenu.hidden = true;

      // Clean vars
      this.isEditMode = false;
      this.numberOfDownloads = 0;
      this.numberOfCheckedDownloads = 0;
    },

    _downloadApiManagerListener:
      function d_downloadApiManagerListener(changeEvent) {
        switch (changeEvent.type) {
          case 'added':
            // First we'll try and find an existing item with the download
            // api id.
            var element = null;
            if (changeEvent.downloadApiId &&
                (element = this._getElementForId(changeEvent.downloadApiId))) {
              // If we find one, we'll want to update it's id before updating
              // the content.
              DownloadItem.updateDownloadId(changeEvent.download, element);
            } else if ((element = this._getElementForId(
              changeEvent.download.id))) {
              // Secondly, try and find it by it's download id.
              this._update(changeEvent.download);
            } else {
              // Lastly, if we didn't find it by downloadApiId or id, it's
              // truly new to the user so we need to add it to the download
              // list.
              this._newDownload(changeEvent.download);
            }
            break;
        }
    },

    init: function(elements, oncomplete) {
      this._elements = elements;

      // Initialize the Api Manager and set our listener.
      DownloadApiManager.init();
      DownloadApiManager.setListener(
        this._downloadApiManagerListener.bind(this));

      // Render the entire list
      DownloadApiManager.getDownloads(
        this._render.bind(this),
        this._onerror.bind(this),
        oncomplete
      );

      // Update method added
      DownloadApiManager.setOnDownloadHandler(this._newDownload.bind(this));

      // Add listener to edit mode
      this._elements.editButton.addEventListener('click',
        this._loadEditMode.bind(this));
      this._elements.editHeader.addEventListener('action',
        this._closeEditMode.bind(this));
      this._elements.selectAllButton.addEventListener('click',
        this._enableAllChecks.bind(this));
      this._elements.deselectAllButton.addEventListener('click',
        this._disableAllChecks.bind(this));
      this._elements.deleteButton.addEventListener('click',
        this._deleteDownloads.bind(this));
      this._elements.downloadsContainer.addEventListener('click',
        this._onDownloadSelected.bind(this));
    }
  };

  return function ctor_downloadList() {
    return new DownloadsList();
  };
});
