/* global LoadHelper */

(function() {
  'use strict';

  document.getElementById('menu-item-gt').addEventListener('click', function() {
    window.LazyLoader.load(
      [
        document.getElementById('welcome'),
        document.getElementById('la-explain'),
        document.getElementById('la-blur'),
        document.getElementById('la-custom'),
        document.getElementById('la-exceptions'),
        document.getElementById('rpp-explain'),
        document.getElementById('rpp-passphrase'),
        document.getElementById('rpp-locate'),
        document.getElementById('rpp-ring'),
        document.getElementById('rpp-lock')
      ],
      function() {
        document.getElementById('root').style.display = 'none';
        document.getElementById('welcome').style.display = 'block';

        var sections = document.querySelectorAll('section[data-section="gt"]');
        LoadHelper.registerEvents(sections);
      }
    );
  });

})();
