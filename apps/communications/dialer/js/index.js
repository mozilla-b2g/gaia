'use strict';

window.addEventListener('load', function dialerSetup() {
  window.removeEventListener('load', dialerSetup);

  KeypadManager.init();
  NavbarManager.init();

  setTimeout(function nextTick() {
    var lazyPanels = ['add-contact-action-menu',
                      'confirmation-message',
                      'edit-mode',
                      'sim-picker'];

    var lazyPanelsElements = lazyPanels.map(function toElement(id) {
      return document.getElementById(id);
    });
    LazyLoader.load(lazyPanelsElements);

    CallHandler.init();
    LazyL10n.get(function loadLazyFilesSet() {
      LazyLoader.load(['/shared/js/fb/fb_request.js',
                       '/shared/js/fb/fb_data_reader.js',
                       '/shared/js/fb/fb_reader_utils.js',
                       '/shared/style/confirm.css',
                       '/shared/js/confirm.js',
                       '/shared/style/edit_mode.css',
                       '/shared/style/headers.css']);
      lazyPanelsElements.forEach(navigator.mozL10n.translate);
    });
  });
});
