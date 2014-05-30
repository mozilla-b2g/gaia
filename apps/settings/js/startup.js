/* global LazyLoader */
(function(exports) {
  'use strict';

  var _defaultPanelId = null;
  Object.defineProperty(exports, 'LaunchContext', {
    configurable: false,
    get: function() {
      return {
        defaultPanelId: _defaultPanelId,
        activityHandler: window.ActivityHandler
      };
    }
  });

  function loadAlameda() {
    var scriptNode = document.createElement('script');
    scriptNode.setAttribute('data-main', 'js/main.js');
    scriptNode.src = 'js/vendor/alameda.js';
    document.head.appendChild(scriptNode);
  }

  function showPlaceholderAndDefaultPanel(defaultPanelId) {
    var placeholderTitle = document.querySelector('#placeholder h1');
    var defaultPanel = document.getElementById(defaultPanelId);

    navigator.mozL10n.once(function() {
      LazyLoader.load([defaultPanel], function() {
        var defaultPanelTitle = defaultPanel.querySelector('header h1');
        navigator.mozL10n.translate(defaultPanel);
        // Set the title of the place holder so that we can show it to users
        // as soon as possible.
        navigator.mozL10n.localize(placeholderTitle,
          defaultPanelTitle.dataset.l10nId);
        defaultPanel.classList.add('current');

        // Load alameda and the required modules defined in main.js.
        loadAlameda();

        // Activate the animation
        setTimeout(function nextTick() {
          document.body.dataset.ready = true;
        });
      });
    });
  }

  window.addEventListener('load', function loaded() {
    window.removeEventListener('load', loaded);
    if (navigator.mozHasPendingMessage('activity')) {
      // Load activity handler only when we need to handle it.
      LazyLoader.load(['js/activity_handler.js'], function ah_loaded() {
        window.ActivityHandler.ready(function ah_ready() {
          _defaultPanelId = window.ActivityHandler.targetPanelId;
          showPlaceholderAndDefaultPanel(_defaultPanelId);
        });
      });
    } else {
      _defaultPanelId = 'root';
      showPlaceholderAndDefaultPanel(_defaultPanelId);
    }
  });
}(this));
