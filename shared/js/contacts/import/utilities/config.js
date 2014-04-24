'use strict';
/* global Promise */

var utils = window.utils || {};

if (typeof utils.config === 'undefined') {
  (function() {
    var configs = {};
    var initializing = {};
    var initialized = {};

    var EVENT_INITIALIZED = 'config_initialized';

    utils.config = utils.config || {};

    utils.config.reset = function() {
      configs = {};
      initializing = {};
      initialized = {};
    };

    utils.config.load = function(file) {
      return new Promise(function(resolve, reject) {
        var isInitialized = initialized[file];
        if (isInitialized === true) {
          resolve(configs[file]);
          return;
        }

        var isInitializing = initializing[file];
        if (isInitializing) {
          var handler = function(expectedFile, e) {
            document.removeEventListener(EVENT_INITIALIZED, handler);
            var file = e.detail.file;
            if (expectedFile !== file) {
              return;
            }

            if (e.detail.success) {
              resolve(configs[file]);
            }
            else {
              reject();
            }
          }.bind(null, file);

          document.addEventListener(EVENT_INITIALIZED, handler);
          return;
        }

        initializing[file] = true;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', file, true);
        xhr.responseType = 'json';

        xhr.onload = function() {
          configs[file] = xhr.response;
          delete initializing[file];
          initialized[file] = true;

          document.dispatchEvent(new CustomEvent(EVENT_INITIALIZED, {
            detail: {
              file: file,
              success: true
            }
          }));
          resolve(configs[file]);
        };

        xhr.onerror = function() {
           document.dispatchEvent(new CustomEvent(EVENT_INITIALIZED, {
            detail: {
              file: file,
              success: false
            }
          }));
          delete initializing[file];
          reject(xhr.error);
        };

        xhr.send(null);
      });
    };
  })();
}
