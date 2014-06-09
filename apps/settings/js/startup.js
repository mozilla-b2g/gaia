(function() {
  'use strict';
  function startApp() {
    navigator.mozL10n.once(function l10nDone() {
      // Since the settings app contains its chrome already existing in the DOM,
      // we can fire that it's loaded as soon as the DOM is localized
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      // Since the settings app has no functional chrome, we can fire the
      // interactive event now because there are no events to bind
      window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
    });

    var scriptNode = document.createElement('script');
    scriptNode.setAttribute('data-main', 'js/main.js');
    scriptNode.src = 'js/vendor/alameda.js';
    document.head.appendChild(scriptNode);
  }

  window.addEventListener('load', startApp, false);
}());
