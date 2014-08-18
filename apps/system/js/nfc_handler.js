/* globals NfcUtils */
'use strict';
(function(exports) {
  var NfcHandler = function (appWindowManager) {
    this.appWindowManager = appWindowManager;
  };

  NfcHandler.prototype = {
    start: function nh_start() {
      if (window.navigator.mozNfc) {
        window.navigator.mozNfc.onpeerready = this.handleEvent.bind(this);
      }
    },

    stop: function ng_stop() {
      if (window.navigator.mozNfc) {
        window.navigator.mozNfc.onpeerready = null;
      }
    },

    handleEvent: function nh_handleEvent(evt) {
      var nfcUtils = new NfcUtils();
      if (evt.type !== 'peerready') {
        return;
      }
      var currentApp = this.appWindowManager.getActiveApp();
      if (currentApp && currentApp.isBrowser() && currentApp.url) {
        this.sendNDEFRequestToNFCPeer(nfcUtils.parseURIString(currentApp.url),
          evt);
      }
    },

    /**
     * Send NDEF request to NFC peer.
     * @param {MozNDEFRecord} request non-null Array of NDEF records.
     * @param {Events} nfcEvent  an event from mozNfc.onpeerready.
     */
    sendNDEFRequestToNFCPeer:
      function nh_sendNDEFRequestToNFCPeer(request, nfcEvent) {
        if (!request) {
          return;
        }
        var nfcPeer = nfcEvent.peer;
        if (!nfcPeer) {
          return null;
        }

        nfcPeer.sendNDEF(request);
      }
  };

  exports.NfcHandler = NfcHandler;

}(window));
