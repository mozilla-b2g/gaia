'use strict';

/**
 * This contains a simple LazyLoader implementation
 * To use:
 *
 *   LazyLoader.load(
 *    ['/path/to/file.js', '/path/to/file.css', 'domNode'], callback
 *   );
 */
var LazyLoader = (function() {

  function LazyLoader() {
    this._loaded = {};
    this._isLoading = {};
  }

  LazyLoader.prototype = {

    _js: function(file, callback) {
      // When the lazy loader is used into the onload handler this
      // usually means the page is ready to display, this is where
      // we wait in the window manager to remove the cover and show
      // the app itself. setTimeout here ensure that the load event
      // is fired before we load those additional scripts that are
      // not needed for displaying quickly the app.
      setTimeout(function nextTick(self) {
        var script = document.createElement('script');
        script.src = file;
        // until bug 916255 lands async is the default so
        // we must disable it so scripts load in the order they where
        // required.
        script.async = false;
        script.addEventListener('load', callback);
        document.head.appendChild(script);
        self._isLoading[file] = script;
      }, 0, this);
    },

    _css: function(file, callback) {
      setTimeout(function nextTick() {
        var style = document.createElement('link');
        style.type = 'text/css';
        style.rel = 'stylesheet';
        style.href = file;
        document.head.appendChild(style);
        callback();
      });
    },

    _html: function(domNode, callback) {

      // The next few lines are for loading html imports in DEBUG mode
      if (domNode.getAttribute('is')) {
        this.load(['/shared/js/html_imports.js'], function() {
          HtmlImports.populate(callback);
        }.bind(this));
        return;
      }

      for (var i = 0; i < domNode.childNodes.length; i++) {
        if (domNode.childNodes[i].nodeType == document.COMMENT_NODE) {
          domNode.innerHTML = domNode.childNodes[i].nodeValue;
          break;
        }
      }
      callback();
    },

    load: function(files, callback) {
      if (!Array.isArray(files))
        files = [files];

      var loadsRemaining = files.length, self = this;
      function perFileCallback(file) {
        if (self._isLoading[file])
          delete self._isLoading[file];
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
        } else if (this._isLoading[file]) {
          this._isLoading[file].addEventListener(
            'load', perFileCallback.bind(null, file));
        } else {
          var method, idx;
          if (typeof file === 'string') {
            method = file.match(/.([^\.]+)$/)[1];
            idx = file;
          } else {
            method = 'html';
            idx = file.id;
          }

          this['_' + method](file, perFileCallback.bind(null, idx));
        }
      }
    }
  };

  return new LazyLoader();
}());
