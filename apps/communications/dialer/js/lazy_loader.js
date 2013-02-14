'use strict';

var LazyLoader = {
  _loaded: {},
  _inDOM: {},

  _loadScript: function(file, callback) {
    var script = document.createElement('script');
    script.type = 'application/javascript';
    script.src = file;
    script.addEventListener('load', callback.bind(null, file), false);
    document.head.appendChild(script);
    this._inDOM[file] = script;
  },

  _loadStyle: function(file, callback) {
    var style = document.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';
    style.href = file;
    document.head.appendChild(style);
    callback(file);
  },

  load: function(files, callback) {
    if (!Array.isArray(files))
      files = [files];

    var loadsRemaining = files.length, self = this;
    function perFileCallback(file) {
      if (self._inDOM[file])
        delete self._inDOM[file];
      self._loaded[file] = true;

      if (--loadsRemaining === 0) {
        if (callback)
          callback();
      }
    }

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (this._loaded[file]) {
        perFileCallback(file);
      }
      else if (this._inDOM[file]) {
        this._inDOM[file].addEventListener(
          'load', perFileCallback.bind(null, file));
      }
      else {
        if (/\.js$/.test(file)) {
          this._loadScript(file, perFileCallback);
        }
        else if (/\.css$/.test(file)) {
          this._loadStyle(file, perFileCallback);
        }
      }
    }
  }
};

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
    LazyLoader.load(['/shared/js/l10n.js',
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
