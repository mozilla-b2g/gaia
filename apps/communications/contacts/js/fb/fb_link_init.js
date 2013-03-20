'use strict';

(function(document) {
  var href = window.location.href;
  var hashes = href.slice(href.indexOf('?') + 1).split('&');

  var vars = {};
  for (var i = 0; i < hashes.length; i++) {
    var hash = hashes[i].split('=');
    vars[hash[0]] = hash[1];
  }

  // Getting the timeout config from the parent
  if (parent.fb) {
    fb.operationsTimeout = parent.fb.operationsTimeout;
  }

  utils.listeners.add({
    '#link-close': fb.link.ui.end,
    '#friends-list': fb.link.ui.selected
  });

  // This event listener is added manually as it wil be changing dynamically
  document.querySelector('#view-all').onclick = fb.link.ui.viewAllFriends;

  // Module fb.contacts is initialized just in case we need it
  fb.contacts.init(function fb_init() {
    window.addEventListener('message', function getAccessToken(e) {
      window.removeEventListener('message', getAccessToken);
       fb.link.start(vars[fb.link.CID_PARAM], e.data.data,
                     vars[fb.link.ORDER_BY_PARAM]);
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
