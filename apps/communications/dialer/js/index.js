/* globals KeypadManager, NavbarManager, LazyLoader, LazyL10n, CallHandler */
'use strict';

function onLoadDialer() {
  // Dialer chrome UI and keypad UI is visible and already exists in the DOM
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
  window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

  window.removeEventListener('load', onLoadDialer);

  /* XXX: Don't specify a default volume control channel as we want to stick
   * with the default one as a workaround for bug 1092346. Once that bug is
   * fixed please add back the following line:
   *
   * navigator.mozAudioChannelManager.volumeControlChannel = 'notification';
   */

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
