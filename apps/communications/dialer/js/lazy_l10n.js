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
    var derahs = 'shared'; // Ugly, waiting for bug 822108

    var l10nScript = document.createElement('script');
    l10nScript.src = '/' + derahs + '/js/l10n.js';
    document.head.appendChild(l10nScript);

    var l10nDateScript = document.createElement('script');
    l10nDateScript.src = '/' + derahs + '/js/l10n_date.js';
    document.head.appendChild(l10nDateScript);

    this._inDOM = true;

    this._waitForLoad(callback);
  },

  _waitForLoad: function ll10n_waitForLoad(callback) {
    var self = this;
    window.addEventListener('localized', function onLocalized() {
      window.removeEventListener('localized', onLocalized);

      document.documentElement.lang = navigator.mozL10n.language.code;
      document.documentElement.dir = navigator.mozL10n.language.direction;

      self._loaded = true;
      callback(navigator.mozL10n.get);
    });
  }
};
