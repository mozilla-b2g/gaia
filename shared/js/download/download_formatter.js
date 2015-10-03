/* global mozIntl */

/**
 * This lib relies on `l10n.js' to implement localizable date/time strings.
 *
 * The proposed `DownloadFormatter' object provides features for formatting
 * the data retrieved from the new API for Downloads, taking into account
 * the structure defined by the API itself.
 */


(function(exports) {
  'use strict';

  var NUMBER_OF_DECIMALS = 2;
  var BYTE_SCALE = ['B', 'KB', 'MB', 'GB', 'TB'];

  function _getFormattedSize(bytes) {
    if (bytes === undefined || isNaN(bytes)) {
      return Promise.resolve(null);
    }

    var index = 0;
    while (bytes >= 1024 && index < BYTE_SCALE.length) {
      bytes /= 1024;
      ++index;
    }

    return navigator.mozL10n.
      formatValue('byteUnit-' + BYTE_SCALE[index]).then(unit => {
      return navigator.mozL10n.formatValue('fileSize', {
        size: bytes.toFixed(NUMBER_OF_DECIMALS),
        unit: unit
      });
    });
  }

  function _calcPercentage(currently, total) {
    if (total === 0) {
      return 0;
    }

    return parseInt((100 * currently) / total);
  }

  var DownloadFormatter = {
    getFormattedSize: function(bytes) {
      return _getFormattedSize(bytes);
    },
    getPercentage: function(download) {
      return _calcPercentage(download.currentBytes, download.totalBytes);
    },
    getFileName: function(download) {
      return download.path.split('/').pop(); // filename.ext
    },
    getTotalSize: function(download) {
      var bytes = download.totalBytes;
      return _getFormattedSize(bytes);
    },
    getDownloadedSize: function(download) {
      var bytes = download.currentBytes;
      return _getFormattedSize(bytes);
    },
    getDate: function(download) {
      var date;

      try {
        date = download.startTime;
      } catch (ex) {
        date = new Date();
        console.error(ex);
      }

      var formatter = mozIntl._gaia.RelativeDate(navigator.languages);
      return formatter.format(date);
    },
    getUUID: function(download) {
      return download.id || this.getFileName(download);
    }
  };

  exports.DownloadFormatter = DownloadFormatter;

}(this));
