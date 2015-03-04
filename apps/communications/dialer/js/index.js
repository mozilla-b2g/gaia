/* globals KeypadManager, NavbarManager, LazyLoader, LazyL10n, CallHandler */
'use strict';

function onLoadDialer() {
  // Dialer chrome UI and keypad UI is visible and already exists in the DOM
  window.performance.mark('navigationLoaded');
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
  window.performance.mark('visuallyLoaded');
  window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

  window.removeEventListener('load', onLoadDialer);

  /* Tell the audio channel manager that we want to adjust the "notification"
   * channel when the user presses the volumeup/volumedown buttons. */
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
  }

  KeypadManager.init(/* oncall */ false);
  // Keypad (app core content) is now bound
  window.performance.mark('contentInteractive');
  window.dispatchEvent(new CustomEvent('moz-content-interactive'));

  NavbarManager.init();
  // Navbar (chrome) events have now been bound
  window.performance.mark('navigationInteractive');
  window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

  setTimeout(function nextTick() {
    var lazyPanels = ['confirmation-message',
                      'edit-mode',
                      'sim-picker'];

    var lazyPanelsElements = lazyPanels.map(function toElement(id) {
      return document.getElementById(id);
    });
    LazyLoader.load(lazyPanelsElements);

    CallHandler.init();
    LazyL10n.get(function loadLazyFilesSet() {
      LazyLoader.load([
        '/shared/js/fb/fb_request.js',
        '/shared/js/fb/fb_data_reader.js',
        '/shared/js/fb/fb_reader_utils.js',
        '/shared/style/confirm.css',
        '/shared/js/confirm.js',
        '/shared/elements/config.js',
        '/shared/elements/gaia-header/dist/gaia-header.js',
        '/shared/style/edit_mode.css'
      ], function fileSetLoaded() {
        window.performance.mark('fullyLoaded');
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      });
    });
  });
}

window.addEventListener('load', onLoadDialer);
