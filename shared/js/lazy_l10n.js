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
    _baseLoaded: false,
    _ready: false,

    get: function ll10n_get(callback) {
      if (this._ready) {
        callback(navigator.mozL10n.get);
        return;
      }

      var loadDateAndFinalize = this._loadDateAndFinalize.bind(this, callback);

      if (this._baseLoaded) {
        navigator.mozL10n.once(loadDateAndFinalize);
        return;
      }

      // Add the l10n JS files to the DOM and wait for them to load.
      loader.load(['/shared/js/l10n.js'], function baseLoaded() {
        this._baseLoaded = true;
        navigator.mozL10n.once(loadDateAndFinalize);
      }.bind(this));
    },

    _loadDateAndFinalize: function ll10n_loadDateAndFinalize(callback) {
      loader.load('/shared/js/l10n_date.js',
                  this._finalize.bind(this, callback));
    },

    _finalize: function ll10n_finalize(callback) {
      this._ready = true;
      callback(navigator.mozL10n.get);
    }
  };

}());
