/* globals NfcUtils, BaseModule, Service */
'use strict';
(function() {
  var NfcHandler = function (core) {
    this.nfc = core.nfc;
  };

  /**
   * @class NfcCore
   */
  BaseModule.create(NfcHandler, {
    name: 'NfcHandler',

    _start: function nh_start() {
      this.nfc.addEventListener('peerready', this);
    },

    handleEvent: function nh_handleEvent(evt) {
      var nfcUtils = new NfcUtils();
      if (evt.type !== 'peerready') {
        return;
      }
      var currentApp = Service.query('getTopMostWindow');
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
  });
}());
