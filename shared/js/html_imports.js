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
    var imports = document.querySelectorAll('link[rel="import"]');
    if (!imports.length)
      return;

    var pending = imports.length;

    Array.prototype.forEach.call(imports, function eachImport(eachImport) {
      this.getImportContent(eachImport.href, function gotContent(content) {
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
        if (!(--pending)) {
          callback();
        }
      });
    }, this);
  },

  getImportContent: function(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function(o) {
      callback(xhr.responseText);
    };
    xhr.open('GET', path, true);
    xhr.send();
  }
};

