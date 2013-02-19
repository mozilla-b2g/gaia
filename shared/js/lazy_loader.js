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
      var script = document.createElement('script');
      script.src = file;
      script.addEventListener('load', callback);
      document.head.appendChild(script);
      this._isLoading[file] = script;
    },

    _css: function(file, callback) {
      var style = document.createElement('link');
      style.type = 'text/css';
      style.rel = 'stylesheet';
      style.href = file;
      document.head.appendChild(style);
      callback();
    },

    _html: function(domNode, callback) {
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
            method = file.match(/\.(.*?)$/)[1];
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
