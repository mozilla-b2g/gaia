'use strict';

if (typeof window.oauthFrame === 'undefined') {
  (function() {

    var targetService;
    var oauthFrame = window.oauthFrame = {};
    var oauthParams = oauthflow.params;

    function cancelCb() {
      Curtain.hide();

      parent.postMessage({
        type: 'abort',
        data: ''
      }, oauthParams[targetService].appOrigin);
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
      var data = e.data;

      if (data && data.type === 'start') {
        oauthFrame.start(data.data.from, data.data.service);
      }
    });
  })();
}
