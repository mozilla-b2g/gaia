'use strict';

var loader = LazyLoader;

var LazyL10n = {
  _inDOM: false,
  _loaded: false,

  get: function ll10n_get(callback) {
    if (this._loaded) {
      callback(navigator.mozL10n.get);
      return;
    }

    if (this._inDOM) {
      this._waitForLoad(callback);
      return;
    }

    // Add the l10n JS files to the DOM and wait for them to load.
    loader.load(['/shared/js/l10n.js',
                 '/shared/js/l10n_date.js']);
    this._waitForLoad(callback);
    this._inDOM = true;
  },

  _waitForLoad: function ll10n_waitForLoad(callback) {
    var finalize = this._finalize.bind(this);
    window.addEventListener('localized', function onLocalized() {
      window.removeEventListener('localized', onLocalized);
      finalize(callback);
    });
  },

  _finalize: function ll10n_finalize(callback) {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
    this._loaded = true;
    callback(navigator.mozL10n.get);
  }
};
