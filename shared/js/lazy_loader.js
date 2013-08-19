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

  function error(target, file) {
    window.console.error('Error while loading %s: %s', target, file);
  }

  LazyLoader.prototype = {

    _js: function(file, callback) {
      var script = document.createElement('script');
      script.src = file;
      function scriptHandler() {
        error('script', script.src);
        script.removeEventListener('error', scriptHandler);
      }
      script.addEventListener('load', function load() {
        callback();
        script.removeEventListener('load', load);
        script.removeEventListener('error', scriptHandler);
      });
      script.addEventListener('error', scriptHandler);
      document.head.appendChild(script);
      this._isLoading[file] = script;
    },

    _css: function(file, callback) {
      var style = document.createElement('link');
      function styleHandler() {
        error('style sheet', style.href);
        style.removeEventListener('error', styleHandler);
      }
      style.type = 'text/css';
      style.rel = 'stylesheet';
      style.href = file;
      style.addEventListener('error', styleHandler);
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
