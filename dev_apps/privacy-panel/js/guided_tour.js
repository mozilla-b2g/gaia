'use strict';

(function() {

  /**
   * Loads a template.
   */
  function loadTemplates(callback) {
    var templates = [
      document.getElementById('welcome'),
      document.getElementById('la_explain'),
      document.getElementById('la_blur'),
      document.getElementById('la_custom'),
      document.getElementById('la_exceptions'),
      document.getElementById('rpp_explain'),
      document.getElementById('rpp_passphrase'),
      document.getElementById('rpp_locate'),
      document.getElementById('rpp_ring'),
      document.getElementById('rpp_lock')
    ];
    window.LazyLoader.load(templates, callback);
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
