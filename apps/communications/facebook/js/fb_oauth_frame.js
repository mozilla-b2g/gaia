'use strict';

if (typeof window.oauthFrame === 'undefined') {
  (function() {

    var targetService;
    var oauthFrame = window.oauthFrame = {};
    var oauthParams = oauthflow.params;

    function notifyParent(message, origin) {
      parent.postMessage({
        type: message.type || '',
        data: message.data || ''
      }, origin);
    }

    function cancelCb() {
      Curtain.hide(notifyParent.bind(null, {
        type: 'abort'
      }, oauthParams[targetService].appOrigin));
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
        }, oauthParams[service].appOrigin);
      }, from, service);
    };

    window.addEventListener('message', function messageHandler(e) {
      var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';
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
