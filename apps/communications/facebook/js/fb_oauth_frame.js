'use strict';

if (typeof window.oauthFrame === 'undefined') {
  (function() {

    var targetService;
    var oauthFrame = window.oauthFrame = {};
    var oauthParams = oauthflow.params;
    var CONTACTS_APP_ORIGIN = location.origin;

    function notifyParent(message, origin) {
      parent.postMessage({
        type: message.type || '',
        data: message.data || ''
      }, origin);
    }

    function cancelCb() {
      Curtain.hide(notifyParent.bind(null, {
        type: 'abort'
      }, CONTACTS_APP_ORIGIN));
    }

    oauthFrame.start = function(from, service) {
      targetService = service;
      oauth2.getAccessToken(function tokenReady(access_token) {
        Curtain.oncancel = cancelCb;

        if (!Curtain.visible) {
          Curtain.show('wait', from);
        }

        parent.postMessage({
          type: 'authenticated',
          data: access_token
        }, CONTACTS_APP_ORIGIN);
      }, from, service);
    };

    window.addEventListener('message', function messageHandler(e) {
      if (e.origin !== CONTACTS_APP_ORIGIN) {
        return;
      }
      var data = e.data;
      if (data && data.type === 'start') {
        oauthFrame.start(data.data.from, data.data.service);
      }
    });
  })();
}
