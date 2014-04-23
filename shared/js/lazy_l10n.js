/* globals LazyLoader*/
'use strict';

/**
 * This provides a simple function call to delay localization load
 * To use, simply wrap required localizable content with:
 * LazyL10n.get(callback)
 */
(function() {

  var loader = LazyLoader;

  window.LazyL10n = {
    _inDOM: false,
    _loaded: false,

    get: function ll10n_get(callback) {
      if (this._loaded) {
        callback(navigator.mozL10n.get);
        return;
      }

      var loadDate = this._loadDate.bind(this, callback);

      if (this._inDOM) {
        navigator.mozL10n.once(loadDate);
        return;
      }

      // Add the l10n JS files to the DOM and wait for them to load.
      loader.load(['/shared/js/l10n.js'], function baseLoaded() {
        navigator.mozL10n.once(loadDate);
      });
      this._inDOM = true;
    },

    _loadDate: function ll10n_loadDate(callback) {
      loader.load('/shared/js/l10n_date.js',
                  this._finalize.bind(this, callback));
    },

    _finalize: function ll10n_finalize(callback) {
      this._loaded = true;
      callback(navigator.mozL10n.get);
    }
  };

}());
