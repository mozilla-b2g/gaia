'use strict';

(function(document) {
  var isContactsMode = window.location.search.indexOf('contacts') !== -1;
  var allowedOrigin = fb.oauthflow.params.contactsAppOrigin;

  function cancelCb() {
    Curtain.hide();

    parent.postMessage({
      type: 'abort',
      data: ''
    }, allowedOrigin);
  }

  function tokenReady(access_token) {
    // The curtain is only shown when we are launched from contacts
    if (!isContactsMode) {
      Curtain.show('wait', 'friends', {
        oncancel: cancelCb
      });
    }

    if (document.readyState === 'complete') {
      onLoad(access_token);
    }
    else {
      window.addEventListener('load', function do_load() {
        onLoad(access_token);
        window.removeEventListener('load', do_load);
      });
    }
  }


  function onLoad(access_token) {
    // Getting the timeout config from the parent
    if (parent.fb) {
      fb.operationsTimeout = parent.fb.operationsTimeout;
    }

    utils.listeners.add({
      '#import-close': fb.importer.ui.end,
      '#import-action': fb.importer.ui.importAll,
      '#done-search': contacts.Search.exitSearchMode,
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
      fb.importer.start(access_token);
    });
  }

  window.addEventListener('localized', function fb_localized(evt) {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  });

  if (isContactsMode) {
    window.addEventListener('message', function getAccessToken(e) {
      window.removeEventListener('message', getAccessToken);
      if (e.data.type === 'token') {
        tokenReady(e.data.data);
      }
    });

    parent.postMessage({
      type: 'messaging_ready',
      data: ''
    }, allowedOrigin);
  } else {
    fb.oauth.getAccessToken(tokenReady, 'friends');
  }

})(document);
