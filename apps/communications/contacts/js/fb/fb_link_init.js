'use strict';

(function(document) {
  var cid = window.location.search.substring(fb.link.CID_PARAM.length + 2);

  // Getting the timeout config from the parent
  if (parent.fb) {
    fb.operationsTimeout = parent.fb.operationsTimeout;
  }

  utils.listeners.add({
    '#link-close': fb.link.ui.end,
    '#friends-list': fb.link.ui.selected
  });

  fb.link.init();

  // This event listener is added manually as it wil be changing dynamically
  document.querySelector('#view-all').onclick = fb.link.ui.viewAllFriends;

  // Module fb.contacts is initialized just in case we need it
  fb.contacts.init(function fb_init() {
    window.addEventListener('message', function getAccessToken(e) {
      if (e.origin !== fb.CONTACTS_APP_ORIGIN) {
        return;
      }
      window.removeEventListener('message', getAccessToken);
      fb.link.start(cid, e.data.data);
    });

    parent.postMessage({
      type: 'messaging_ready',
      data: ''
    }, fb.CONTACTS_APP_ORIGIN);
  });

  window.addEventListener('localized', function initContacts(evt) {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  });
})(document);
