'use strict';

fb.contacts.init(function fb_init() {
  fb.importer.ui.init();
  fb.importer.ui.getFriends();
});

window.addEventListener('localized', function initContacts(evt) {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});
