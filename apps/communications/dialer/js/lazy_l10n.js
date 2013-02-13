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

    // Adding the l10n JS files to the DOM
    // the l10n resources
    var l10nScript = document.createElement('script');
    l10nScript.src = '/shared/js/l10n.js';
    document.head.appendChild(l10nScript);
    this._waitForLoad(callback);
    this._inDOM = true;

    var l10nDateScript = document.createElement('script');
    l10nDateScript.src = '/shared/js/l10n_date.js';
    document.head.appendChild(l10nDateScript);
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
