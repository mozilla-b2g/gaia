'use strict';

/* global DownloadStore, DownloadFormatter, DownloadHelper, LazyLoader */

/*
 * This library implements a picker activity for downloaded files.
 *
 * How it works:
 *
 * var activity = new MozActivity({
 *   name: 'pick', 
 *   data: {
 *     type: 'application/*'
 *   }
 * });
 *
 * ... and returns an object like this:
 *
 * activity.onsuccess = function(e) {
 *   console.log('Name of the file:', activity.result.name);
 *   console.log('Mime type:', activity.result.type);
 *   console.log('Binary content:', activity.result.blob);
 *   console.log('File path:', activity.result.path);
 *   console.log('File size in bytes:', activity.result.size);
 * };
 */

(function(exports) {

  const CHUNK_SIZE = 10;

  function DownloadPicker() {
    this.header = document.querySelector('#header');
    this.list = document.querySelector('#downloads ul');
    // It holds download objects indexed by id.
    this.downloads = Object.create(null);

    navigator.mozSetMessageHandler('activity', this.handleActivity.bind(this));
  }

  DownloadPicker.prototype = {
    handleActivity: function(activity) {
      switch (activity.source.name) {
        case 'pick':
          this.activity = activity;
          this.attachActionHandlers();
          this.renderList();
          break;

        default:
          activity.postError('name not supported');
      }
    },

    renderList: function() {
      DownloadStore.getAll().onsuccess = (event) => {
        var result = event.target.result;
        if (!Array.isArray(result)) {
          result = [result];
        }
        // Painting downloads with reverse insertion order (the last the
        // most recent).
        var items = result.reverse();
        // If document.body.dataset.downloads === 0 the UI will show a message
        // telling user that there is not downloads.
        var total = document.body.dataset.downloads = items.length;
        this.renderFragment(items, 0, total);
      };
    },

    renderFragment: function(items, from, total) {
      var target = document.createDocumentFragment();
      var idx = from;
      for (; idx < from + CHUNK_SIZE && idx < total; idx++) {
        this.appendDownload(items[idx], target);
      }

      this.list.appendChild(target);
      (idx < total) && setTimeout(() => {
        this.renderFragment(items, idx, total);
      });
    },

    appendDownload: function(download, target) {
      var id = download.id;
      if (this.downloads[id]) {
        return;
      }

      this.downloads[id] = download;

      var item = document.createElement('li');
      // This parameter lets us know which item was clicked in the list
      item.dataset.id = id;

      // File name
      var pFileName = document.createElement('p');
      pFileName.classList.add('fileName');
      pFileName.textContent = DownloadFormatter.getFileName(download);

      // Additional information (start time and file size in bytes)
      var pInfo = document.createElement('p');
      pInfo.classList.add('info');
      DownloadFormatter.getDate(download, (date) => {
        navigator.mozL10n.setAttributes(pInfo, 'summary', {
          date: date,
          status: DownloadFormatter.getTotalSize(download)
        });
      });

      item.appendChild(pFileName);
      item.appendChild(pInfo);
      target.appendChild(item);
    },

    attachActionHandlers: function() {
      this.header.addEventListener('action', () => {
        // closing the picker activity
        this.activity.postError('cancelled');
      });

      this.list.addEventListener('click', (event) => {
        var download = this.downloads[event.target.dataset.id];
        download && this.pick(download);
      });
    },

    pick: function(download) {
      // download was selected by the user
      LazyLoader.load(['shared/js/mime_mapper.js',
                       'shared/js/download/download_helper.js'], () => {
        var req = DownloadHelper.info(download);

        req.onsuccess = (event) => {
          this.activity.postResult(event.target.result);
        };

        req.onerror = (event) => {
          DownloadHelper.handlerError(req.error, download);
        };
      });
    }
  };

  exports.downloadPicker = new DownloadPicker();

}(window));
