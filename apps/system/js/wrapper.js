/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function onload_launcher_init() {
  window.removeEventListener('load', onload_launcher_init);

  function log(str) {
    dump(' -+- Launcher -+-: ' + str + '\n');
  }

  function currentAppFrame() {
    return WindowManager.getCurrentActiveAppWindow().element;
  }


  function currentAppIframe() {
    return WindowManager.getCurrentActiveAppWindow().browser.element;
  }

  var _ = navigator.mozL10n.get;

  var BUTTONBAR_TIMEOUT = 5000;
  var BUTTONBAR_INITIAL_OPEN_TIMEOUT = 1500;

  var footer = document.querySelector('#wrapper-footer');
  var close_button = document.getElementById('close-button');
  window.addEventListener('appopen', function onAppOpen(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      window.addEventListener('mozbrowserlocationchange', onLocationChange);
      onLocationChange();
      onDisplayedApplicationChange();
    }
  });

  // always show footer while home gesture is enabled
  var homegesture_enabled = false;
  SettingsListener.observe('homegesture.enabled', false, function(value) {
    homegesture_enabled = value;

    if (homegesture_enabled) {
      if (close_button.style.visibility !== 'hidden') {
        close_button.style.visibility = 'hidden';
      }
      if (footer.classList.contains('closed')) {
        footer.classList.remove('closed');
      }
    } else {
      if (close_button.style.visibility !== 'visible') {
        close_button.style.visibility = 'visible';
      }
      if (!footer.classList.contains('closed')) {
        footer.classList.add('closed');
      }
    }
  });

  window.addEventListener('appwillclose', function onAppClose(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      window.removeEventListener('mozbrowserlocationchange', onLocationChange);
      clearTimeout(buttonBarTimeout);
      if (!homegesture_enabled) {
        footer.classList.add('closed');
      }
      isButtonBarDisplayed = false;
    }
  });

  window.addEventListener('keyboardchange', function onKeyboardChange(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      if (footer.classList.contains('visible')) {
        footer.classList.remove('visible');
      }
    }
  });

  window.addEventListener('keyboardhide', function onKeyboardChange(e) {
    if ('wrapper' in currentAppFrame().dataset) {
      if (!footer.classList.contains('visible')) {
        footer.classList.add('visible');
      }
    }
  });
});
