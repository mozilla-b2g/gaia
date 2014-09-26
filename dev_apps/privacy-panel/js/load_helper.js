'use strict';

var LoadHelper = (function() {

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

  return new LoadHelper();
}());
