'use strict';

utils.listeners.add({
  '#import-close': fb.importer.ui.end,
  '#import-action': fb.importer.ui.importAll,
  '#cancel-search': contacts.Search.exitSearchMode,
  '#search-contact': [
    {
      event: 'focus',
      handler: contacts.Search.enterSearchMode
    },
    {
      event: 'keyup',
      handler: contacts.Search.search
    }
  ]
});

// This is done through onclick as it is going to be changed it dynamically
document.querySelector('#select-all').onclick = fb.importer.ui.selectAll;

fb.contacts.init(function fb_init() {
  fb.importer.ui.init();
  fb.importer.ui.getFriends();
});

window.addEventListener('localized', function initContacts(evt) {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});
