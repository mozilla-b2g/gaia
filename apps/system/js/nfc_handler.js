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
      if (currentApp && currentApp.isBrowser() && currentApp.config.url) {
        var ndefUri = nfcUtils.parseURIString(currentApp.config.url);
        this.sendNDEFMessageToNFCPeer(ndefUri, evt);
      }
    },

    /**
     * Send NDEF message to NFC peer.
     * @param {MozNDEFRecord} message non-null Array of NDEF records.
     * @param {Events} nfcEvent  an event from mozNfc.onpeerready.
     */
    sendNDEFMessageToNFCPeer:
      function nh_sendNDEFMessageToNFCPeer(message, nfcEvent) {
        if (!message) {
          return;
        }
        var nfcPeer = nfcEvent.peer;
        if (!nfcPeer) {
          return null;
        }

        nfcPeer.sendNDEF(message);
      }
  };

  exports.NfcHandler = NfcHandler;

}(window));
