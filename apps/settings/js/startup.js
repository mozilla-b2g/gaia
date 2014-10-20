/* global LazyLoader */
(function(exports) {
  'use strict';

  var _initialPanelId = null;
  Object.defineProperty(exports, 'LaunchContext', {
    configurable: false,
    get: function() {
      return {
        initialPanelId: _initialPanelId,
        activityHandler: window.ActivityHandler
      };
    }
  });

  function startApp() {
    navigator.mozL10n.once(function l10nDone() {
      // Since the settings app contains its chrome already existing in the DOM,
      // we can fire that it's loaded as soon as the DOM is localized
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      // Since the settings app has no functional chrome, we can fire the
      // interactive event now because there are no events to bind
      window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
    });

    if (navigator.mozHasPendingMessage('activity')) {
      // Load activity handler only when we need to handle it.
      LazyLoader.load(['js/activity_handler.js'], function ah_loaded() {
        window.ActivityHandler.ready().then(function ah_ready() {
          _initialPanelId = window.ActivityHandler.targetPanelId;
          showInitialPanel(_initialPanelId);
        });
      });
    } else {
      _initialPanelId = 'root';
      showInitialPanel(_initialPanelId);
    }
  }

  function loadAlameda() {
    var scriptNode = document.createElement('script');
    scriptNode.setAttribute('data-main', 'js/main.js');
    scriptNode.src = 'js/vendor/alameda.js';
    document.head.appendChild(scriptNode);
  }

  function showInitialPanel(initialPanelId) {
    var initialPanel = document.getElementById(initialPanelId);
    initialPanel.classList.add('current');
    initialPanel.innerHTML = initialPanel.firstChild.textContent;

    window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

    // Load alameda and the required modules defined in main.js.
    loadAlameda();
  }

  if (document.readyState !== 'loading') {
    startApp();
  } else {
    document.addEventListener('readystatechange', function readyStateChange() {
      if (document.readyState == 'interactive') {
        document.removeEventListener('readystatechange', readyStateChange);
        startApp();
      }
    });
  }

}(this));
