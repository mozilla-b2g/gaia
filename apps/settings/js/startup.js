(function() {
  'use strict';
  function startApp() {
    var scriptNode = document.createElement('script');
    scriptNode.setAttribute('data-main', 'js/main.js');
    scriptNode.src = 'js/vendor/alameda.js';
    document.head.appendChild(scriptNode);
  }

  window.addEventListener('load', startApp, false);
}());
