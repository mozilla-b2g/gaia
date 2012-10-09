'use strict';

var cid = window.location.search.substring(fb.link.CID_PARAM.length + 2);

utils.listeners.add({
  '#link-close': fb.link.ui.end,
  '#friends-list': fb.link.ui.selected
});

// This event listener is added manually as it wil be changing dynamically
document.querySelector('#view-all').onclick = fb.link.ui.viewAllFriends;

// Module fb.contacts is initialized just in case we need it
fb.contacts.init(function fb_init() {
  fb.link.getProposal(cid);
});

window.addEventListener('localized', function initContacts(evt) {
  document.documentElement.lang = navigator.mozL10n.language.code;
  document.documentElement.dir = navigator.mozL10n.language.direction;
});
