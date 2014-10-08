'use strict';

(function() {

  function LoadHelper() {}

  LoadHelper.prototype = {
    /**
     * Change page
     * @param event
     */
    changePage: function(event) {
      var target, id = this.hash.replace('#', '');

      event.preventDefault();

      if ( ! id) {
        return;
      }

      target = document.getElementById(id);
      showSection(target);
    },

    /**
     * Register events for given element
     * @param elements
     */
    registerEvents: function(elements) {
      var element, links, el;

      for (element of elements) {
        links = element.querySelectorAll('.pp-link');

        for (el of links) {
          el.addEventListener('click', this.changePage);
        }
      }
    },

    /**
     * JSON loader
     */
    loadJSON: function(href, callback) {
      if (!callback) {
        return;
      }
      var xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        console.error('Failed to fetch file: ' + href, xhr.statusText);
      };
      xhr.onload = function() {
        callback(xhr.response);
      };
      xhr.open('GET', href, true); // async
      xhr.responseType = 'json';
      xhr.send();
    }
  };

  /**
   * Show section
   * @param element
   */
  var showSection = function(element) {
    var sections = document.querySelectorAll('section');

    for (var section of sections) {
      section.style.display = 'none';
    }

    element.style.display = 'block';
  };

  window.LoadHelper = new LoadHelper();
}());
