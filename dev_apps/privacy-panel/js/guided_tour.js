'use strict';

(function() {

  /**
   * Loads a template.
   */
  function loadTemplates(callback) {
    window.LazyLoader.load([document.getElementById('welcome')], callback);
  }

  function showSection(element) {
    var sections = document.querySelectorAll('section');

    for (var section of sections) {
      section.style.display = 'none';
    }

    element.style.display = 'block';
  }

  function changePage(evt) {
    var target, id = this.hash.replace('#', '');

    evt.preventDefault();

    if ( ! id) {
      return;
    }

    target = document.getElementById(id);
    showSection(target);
  }

  function registerEvents() {
    var links = document.querySelectorAll('.pp-link');

    for (var el of links) {
      el.addEventListener('click', changePage);
    }
  }

  document.getElementById('menuItem-GT').addEventListener('click', function() {
    loadTemplates(function() {
      document.getElementById('root').style.display = 'none';
      document.getElementById('welcome').style.display = 'block';
      registerEvents();
    });
  });

})();
