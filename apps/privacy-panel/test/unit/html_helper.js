define(function() {
  'use strict';

  var parser = new DOMParser();

  function LoadHTMLHelper() {
    this.templates = {};
  }

  LoadHTMLHelper.prototype = {
    
    get: function(filename) {
      if (!(filename in this.templates)) {
        this.requestHTML(filename);
      }
      return this.templates[filename];
    },

    requestHTML: function(filename) {
      var request = new XMLHttpRequest();
      request.open('GET', filename, false);
      request.onerror = function() {
        throw new Error('Unable to load template: ' + filename);
      };
      request.send();

      if (request.status !== 200) {
        request.onerror();
      }

      var result = request.response
        .replace(/<\/?template>/i, '')
        .replace('element', 'section');

      var html = parser.parseFromString(result, 'text/html');
      if (!html) {
        throw new Error('Unable to parse ' + filename + ' for body HTML');
      }

      var name = html.querySelector('section').getAttribute('name');
      html.querySelector('section').setAttribute('id', name);

      this.removeElementsFromHTML(html, 'script');
      this.templates[filename] = html.body;
    },

    removeElementsFromHTML: function(html, selector) {
      var elements = html.querySelectorAll(selector);
      Array.prototype.forEach.call(elements, function(el) {
        el.parentNode.removeChild(el);
      });
    }

  };

  return new LoadHTMLHelper();
});