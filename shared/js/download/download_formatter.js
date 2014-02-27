/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * This lib relies on `l10n.js' to implement localizable date/time strings.
 *
 * The proposed `DownloadFormatter' object provides features for formatting
 * the data retrieved from the new API for Downloads, taking into account
 * the structure defined by the API itself.
 * WARNING: this library relies on the non-standard `toLocaleFormat()' method,
 * which is specific to Firefox -- no other browser is supported.
 */



(function(exports) {
  'use strict';

  var NUMBER_OF_DECIMALS = 2;
  var BYTE_SCALE = ['B', 'KB', 'MB', 'GB', 'TB'];

  function _getFormattedSize(bytes) {
    if (bytes === undefined || isNaN(bytes)) {
      return null;
    }

    var index = 0;
    while (bytes >= 1024 && index < BYTE_SCALE.length) {
      bytes /= 1024;
      ++index;
    }

    var _ = navigator.mozL10n.get;
    return _('fileSize', {
      size: bytes.toFixed(NUMBER_OF_DECIMALS),
      unit: _('byteUnit-' + BYTE_SCALE[index])
    });
  }

  function _calcPercentage(currently, total) {
    if (total == 0) {
      return 0;
    }

    return parseInt((100 * currently) / total);
  }

  /**
   * Escape HTML tags in a string of characters
   *
   * @param {string} str a string of characters
   *
   * @return {string} the HTML-escaped string
   */
  function escapeHTML(str) {
    if (!str || typeof str !== 'string')
      return str;

    var escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');

    // escape quotes
    return escaped.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  var DownloadFormatter = {
    getFormattedSize: function(bytes) {
      return _getFormattedSize(bytes);
    },
    getPercentage: function(download) {
      return _calcPercentage(download.currentBytes, download.totalBytes);
    },
    getFileName: function(download) {
      return escapeHTML(download.path.split('/').pop()); // filename.ext
    },
    getTotalSize: function(download) {
      var bytes = download.totalBytes;
      return _getFormattedSize(bytes);
    },
    getDownloadedSize: function(download) {
      var bytes = download.currentBytes;
      return _getFormattedSize(bytes);
    },
    getDate: function(download, callback) {
      var date;

      try {
        date = download.startTime;
      } catch (ex) {
        date = new Date();
        console.error(ex);
      }

      LazyLoader.load(['shared/js/l10n_date.js'], function onload() {
        var prettyDate = navigator.mozL10n.DateTimeFormat().fromNow(date, true);
        callback && callback(prettyDate);
      });
    },
    getUUID: function(download) {
      return download.id || this.getFileName(download);
    }
  };

  exports.DownloadFormatter = DownloadFormatter;

}(this));
