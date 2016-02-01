define(function(require) {
  'use strict';
  /**
   * Helper class for getting available/used storage
   * required by *_storage.js
   */
  var StorageHelper = {
    /**
     * formatting file size strings.
     *
     * @private
     * @param {Number} bytes size in Bytes
     * @param {Number} digits fixed float digits
     * @returns {Object}
     */
    _getReadableFileSize: function getReadableFileSize(bytes, digits) {
      if (bytes === undefined) {
        return {};
      }

      var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      var size, e;
      if (bytes) {
        e = Math.floor(Math.log(bytes) / Math.log(1024));
        size = (bytes / Math.pow(1024, e)).toFixed(digits || 0);
      } else {
        e = 0;
        size = '0';
      }

      return {
        size: size,
        unit: units[e]
      };
    },

    /**
     * attach formated size to certain element.
     *
     * @public
     * @param {Object} element html element
     * @param {String} l10nId l10n string id
     * @param {Number} sizesize in Bytes
     */
    showFormatedSize: function showFormatedSize(element, l10nId, size) {
      if (size === undefined || isNaN(size)) {
        element.textContent = '';
        return;
      }

      // KB - 3 KB (nearest ones), MB, GB - 1.29 MB (nearest hundredth)
      var fixedDigits = (size < 1024 * 1024) ? 0 : 2;
      var sizeInfo = this._getReadableFileSize(size, fixedDigits);

      document.l10n.formatValue('byteUnit-' + sizeInfo.unit).then(unit => {
        document.l10n.setAttributes(element, l10nId, {
          size: sizeInfo.size,
          unit: unit
        });
      });
    }
  };

  return StorageHelper;
});
