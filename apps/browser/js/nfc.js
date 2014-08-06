// For more info on NFC:
// http://developer.android.com/guide/topics/connectivity/nfc/nfc.html
// https://wiki.mozilla.org/WebAPI/WebNFC#Usage_of_APIs

'use strict';

/* global Browser */
/* global NDEF */
/* global StringHelper */
/* global MozNDEFRecord */

/**
 * Handles NFC connections, share the link of the current tab on peer ready.
 * @namespace NfcURI
 */
var NfcURI = {

  /** Start listening for NFC connections. */
  startListening: function nfc_startListening() {
    if (window.navigator.mozNfc) {
      window.navigator.mozNfc.onpeerready = this.handlePeerConnectivity;
    }
  },

  /** Stop listening for NFC connections. */
  stopListening: function nfc_stopListening() {
    if (window.navigator.mozNfc) {
      window.navigator.mozNfc.onpeerready = null;
    }
  },

  /**
   * Extract the URI data and Identifier Type.
   * Go to shared/nfc_utils.js for Identifier Types.
   */
  lookupUrlRecordType: function nfc_lookupUrlRecordType(uri) {
    for (var i = 1; i < NDEF.URIS.length; i++) {
      var len = NDEF.URIS[i].length;
      if (uri.substring(0, len) == NDEF.URIS[i]) {
          var uriPayload = uri.substring(len);
          return {'identifier' : i, 'uri' : uriPayload};
      }
    }
    return {'identifier' : 0, 'uri' : uri};
  },

  /**
   * Handler for the NFC peer connectivity. Get the URL, call NFC functions.
   * Share current tab link to the connected device.
   */
  handlePeerConnectivity: function nfc_handlePeerConnectvity(event) {
    // Type Name Format ID
    var tnfId = NDEF.TNF_WELL_KNOWN;
    // Record Type Definition
    var rtdUri = NDEF.RTD_URI;
    var currentUrl;
    var records = [];
    var urlPayload = null;
    var abbreviate = true;

    currentUrl = Browser.currentTab.url;

    if (!currentUrl) {
      return null;
    }

    if (abbreviate === true) {
      var split = NfcURI.lookupUrlRecordType(currentUrl);
      if (split.identifier === 0) {
          urlPayload = currentUrl;
      } else {
          urlPayload = String.fromCharCode(split.identifier) + split.uri;
      }
    } else {
      urlPayload = currentUrl;
    }

    if (!urlPayload) {
      return null;
    }

    var payload = StringHelper.fromUTF8(urlPayload);
    var ids = new Uint8Array(0);

    var record = new MozNDEFRecord(tnfId, rtdUri, ids, payload);

    if (!record) {
      return null;
    }

    records.push(record);

    var nfcPeer = event.peer;

    if (!nfcPeer) {
      return null;
    }

    nfcPeer.sendNDEF(records);

  }

};
