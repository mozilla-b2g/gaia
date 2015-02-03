/**
 * Show software informations
 *
 * @module abou_more_info/commitInfo
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:abou_more_info/commitInfo
   * @class commitInfo
   * @returns {commitInfo}
   */
  var commitInfo = function() {
    this._elements = {};
  };

  commitInfo.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf commitInfo.prototype
     * @param {HTMLElement} elements
     */
    init: function mi_init(elements) {
      this._elements = elements;

      this._loadGaiaCommit();
    },

    /**
     * convert date to UTC format.
     *
     * @access private
     * @memberOf commitInfo.prototype
     */
    _dateToUTC: function mi__dateToUTC(d) {
      var arr = [];
      [
        d.getUTCFullYear(), (d.getUTCMonth() + 1), d.getUTCDate(),
        d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()
      ].forEach(function(n) {
        arr.push((n >= 10) ? n : '0' + n);
      });
      return arr.splice(0, 3).join('-') + ' ' + arr.join(':');
    },

    /**
     * show Gaia commit number.
     *
     * @access private
     * @memberOf commitInfo.prototype
     */
    _loadGaiaCommit: function mi__loadGaiaCommit() {
      const GAIA_COMMIT = 'resources/gaia_commit.txt';

      if (this._elements.dispHash.textContent) {
        return; // `gaia-commit.txt' has already been loaded
      }

      var req = new XMLHttpRequest();
      req.onreadystatechange = (function(e) {
        if (req.readyState === 4) {
          if (req.status === 0 || req.status === 200) {
            var data = req.responseText.split('\n');

            /**
             * XXX it would be great to pop a link to the github page
             * showing the commit, but there doesn't seem to be any way to
             * tell the browser to do it.
             */

            var d = new Date(parseInt(data[1] + '000', 10));
            this._elements.dispDate.textContent = this._dateToUTC(d);
            this._elements.dispHash.textContent = data[0].substr(0, 8);
          } else {
            console.error('Failed to fetch gaia commit: ', req.statusText);
          }
        }
      }).bind(this);

      req.open('GET', GAIA_COMMIT, true); // async
      req.responseType = 'text';
      req.send();
    }
  };

  return function ctor_commitInfo() {
    return new commitInfo();
  };
});
