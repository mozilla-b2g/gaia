/* exported LazyLoader */
/* globals HtmlImports, Promise */
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

    _js: function(file) {
      var script = document.createElement('script');
      script.src = file;
      // until bug 916255 lands async is the default so
      // we must disable it so scripts load in the order they where
      // required.
      script.async = false;
      var promise = new Promise(function(resolve) {
        script.addEventListener('load', resolve);
      });
      document.head.appendChild(script);
      this._isLoading[file] = promise;

      return promise;
    },

    _css: function(file) {
      var style = document.createElement('link');
      style.type = 'text/css';
      style.rel = 'stylesheet';
      style.href = file;
      document.head.appendChild(style);
      return Promise.resolve();
    },

    _html: function(domNode) {
      // The next few lines are for loading html imports in DEBUG mode
      if (domNode.getAttribute('is')) {
        return this.load(['/shared/js/html_imports.js']).then(
          () => HtmlImports.populate()
        );
      }

      for (var i = 0; i < domNode.childNodes.length; i++) {
        if (domNode.childNodes[i].nodeType == document.COMMENT_NODE) {
          domNode.innerHTML = domNode.childNodes[i].nodeValue;
          break;
        }
      }

      window.dispatchEvent(new CustomEvent('lazyload', {
        detail: domNode
      }));

      return Promise.resolve();
    },

    /**
     * Retrieves content of JSON file.
     *
     * @param {String} file Path to JSON file
     * @return {Promise} A promise that resolves to the JSON content
     * or null in case of invalid path. Rejects if an error occurs.
     */
    getJSON: function(file) {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', file, true);
        xhr.responseType = 'json';

        xhr.onerror = function(error) {
          reject(error);
        };
        xhr.onload = function() {
          if (xhr.response !== null) {
            resolve(xhr.response);
          } else {
            reject(new Error('No valid JSON object was found (' + 
			     xhr.status + ' ' + xhr.statusText + ')'));
          }
        };

        xhr.send();
      });
    },

    load: function(files, callback) {
      if (!Array.isArray(files)) {
        files = [files];
      }

      var perFileCallback = (file) => {
        if (this._isLoading[file]) {
          delete this._isLoading[file];
        }
        this._loaded[file] = true;
      };

      var resultPromise = Promise.all(
        files.map((file) => {
          if (this._loaded[file.id || file]) {
            perFileCallback(file);
            return Promise.resolve();
          } else if (this._isLoading[file]) {
            return this._isLoading[file].then(() => perFileCallback(file));
          } else {
            var method, idx;
            if (typeof file === 'string') {
              method = file.match(/\.([^.]+)$/)[1];
              idx = file;
            } else {
              method = 'html';
              idx = file.id;
            }

            return this['_' + method](file).then(() => perFileCallback(idx));
          }
        })
      ).then(() => {});

      resultPromise.then(callback);
      return resultPromise;
    }
  };

  return new LazyLoader();
}());
