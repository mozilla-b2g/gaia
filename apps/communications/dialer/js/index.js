/* globals KeypadManager, NavbarManager, LazyLoader, LazyL10n, CallHandler */
'use strict';

function onLoadDialer() {
  // Dialer chrome UI and keypad UI is visible and already exists in the DOM
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
  window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

  window.removeEventListener('load', onLoadDialer);

  /* XXX: Tell the audio channel manager that we want to adjust the "content"
   * channel when the user presses the volumeup/volumedown buttons. We should
   * be using the "notification" channel instead but we can't due to bug
   * 1092346. */
  if (navigator.mozAudioChannelManager) {
    navigator.mozAudioChannelManager.volumeControlChannel = 'content';
  }

  KeypadManager.init(/* oncall */ false);
  // Keypad (app core content) is now bound
  window.dispatchEvent(new CustomEvent('moz-content-interactive'));

  NavbarManager.init();
  // Navbar (chrome) events have now been bound
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
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      });
    });
  });
}

window.addEventListener('load', onLoadDialer);
