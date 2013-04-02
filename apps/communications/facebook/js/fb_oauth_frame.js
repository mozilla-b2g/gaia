'use strict';

var fb = window.fb || {};

if (typeof fb.oauthFrame === 'undefined') {
  (function() {

    var oauthFrame = fb.oauthFrame = {};
    var contactsAppOrigin = fb.oauthflow.params.contactsAppOrigin;

    function cancelCb() {
      Curtain.hide();

      parent.postMessage({
        type: 'abort',
        data: ''
      }, contactsAppOrigin);
    }

    oauthFrame.start = function(from) {
      fb.oauth.getAccessToken(function tokenReady(access_token) {
        Curtain.oncancel = cancelCb;

        if (!Curtain.visible) {
          Curtain.show('wait', from);
        }

        parent.postMessage({
          type: 'authenticated',
          data: access_token
        }, contactsAppOrigin);
      }, from);
    }

    window.addEventListener('message', function messageHandler(e) {
      var data = e.data;

      if (data && data.type === 'start') {
        oauthFrame.start(data.data.from);
      }
    });
  })();
}
