/* exported HtmlImports */
'use strict';

/**
 * This file is included when we encounter lazy loaded nodes
 * in DEBUG mode.
 */
var HtmlImports = {
  /**
   * Populates all custom component nodes
   * Populates nodes with comments, which are then
   * parsed by lazy_loader
   */
  populate: function(callback) {
    var resultPromise;
    var imports = document.querySelectorAll('link[rel="import"]');
    if (!imports.length) {
      resultPromise = Promise.resolve();
      resultPromise.then(callback);
      return;
    }

    resultPromise = Promise.all(
      Array.prototype.map.call(imports, function perImport(eachImport) {
        return this.getImportContent(eachImport.href).then((content) => {
          // Mapping of all custom element templates
          var elementTemplates = {};
          var elementRoot = document.createElement('div');
          elementRoot.innerHTML = content;
          var elements = elementRoot.querySelectorAll('element');

          for (var i = 0, iLen = elements.length; i < iLen; i++) {
            var element = elements[i];
            var template = element.querySelector('template');
            elementTemplates[element.getAttribute('name')] = template.innerHTML;
          }

          var replaceableElements = document.querySelectorAll('*[is]');
          Array.prototype.forEach.call(replaceableElements, function _each(el) {
            if (elementTemplates[el.getAttribute('is')]) {
              el.innerHTML = elementTemplates[el.getAttribute('is')];
              el.removeAttribute('is');
            }
          });
        });
      }, this)
    ).then(() => {});
    resultPromise.then(callback);
    return resultPromise;
  },

  getImportContent: function(path) {
    // bail out if the imported resource isn't in the same origin
    var parsedURL = new URL(path, location.href);
    if (parsedURL.origin !== location.origin) { return; }
    var xhr = new XMLHttpRequest();
    var promise = new Promise(resolve => {
      xhr.onload = function(o) {
        resolve(xhr.responseText);
      };
    });
    xhr.open('GET', path, true);
    xhr.send();

    return promise;
  }
};

