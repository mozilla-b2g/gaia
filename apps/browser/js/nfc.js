'use strict';

var NfcURI = {


  // Extract the URI data and Identifier Type
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

  // Handler for the NFC peer connectivity. Get the URL, call NFC functions
  handlePeerConnectivity: function nfc_handlePeerConnectvity(event) {
    var tnfId = NDEF.TNF_WELL_KNOWN;
    var rtdUri = NDEF.RTD_URI;
    var currentUrl;
    var records = [];
    var urlPayload = null;
    var abbreviate = true;

    currentUrl = Browser.currentTab.url;

    if (!currentUrl)
      return null;

    if (abbreviate == true) {
      var split = NfcURI.lookupUrlRecordType(currentUrl);
      if (split.identifier == 0) {
          urlPayload = currentUrl;
      } else {
          urlPayload = String.fromCharCode(split.identifier) + split.uri;
      }
    } else {
      urlPayload = currentUrl;
    }

    if (!urlPayload)
      return null;

    var payload = StringHelper.fromUTF8(urlPayload);
    var ids = new Uint8Array(0);

    var record = new MozNDEFRecord(tnfId, rtdUri, ids, payload);

    if (!record)
      return null;

    records.push(record);

    var nfcdom = window.navigator.mozNfc;
    var nfcPeer = nfcdom.getNFCPeer(event.detail);

    if (!nfcPeer) {
      return null;
    }

    nfcPeer.sendNDEF(records);

  }

};
