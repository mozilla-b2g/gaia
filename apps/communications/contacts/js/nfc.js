'use strict';

/* global ContactToVcard */
/* global LazyLoader */
/* global MozNDEFRecord*/
/* global NDEF */
/* global NfcUtils */

/* exported NFC */

(function(exports) {
  var mozNfc = window.navigator.mozNfc;
  var currentContact;
  var vCardContact;
  var mozNfcPeer;

  var startListening = function(contact) {
    if (!mozNfc) {
      console.warning('NFC is not available');
      return;
    }

    if (!contact) {
      console.error('Missing contact. Cannot share via NFC');
      return;
    }

    currentContact = contact;
    mozNfc.onpeerready = handlePeerReady;
  };

  var stopListening = function() {
    if (!mozNfc) {
      return;
    }

    mozNfc.onpeerready = null;
    currentContact = null;
    vCardContact = null;
    mozNfcPeer = null;
  };

  var handlePeerReady = function(event) {
    mozNfcPeer = event.peer;
    LazyLoader.load([
      '/shared/js/contact2vcard.js',
      '/shared/js/setImmediate.js',
      '/shared/js/nfc_utils.js'
      ], function() {
      ContactToVcard(
        [currentContact],
        function append(vcard) {
          vCardContact = vcard;
        },
        function success() {
          sendContact();
        },
        // Use default batch size.
        null,
        // We don't want to share a profile photo via NFC,
        // like on Android:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1003767#c5
        true
      );
    });
  };

  var sendContact = function() {
     var nfcUtils = new NfcUtils();
     var NDEFRecord = new MozNDEFRecord({
       tnf: NDEF.TNF_MIME_MEDIA,
       type: nfcUtils.fromUTF8('text/vcard'),
       payload: nfcUtils.fromUTF8(vCardContact)
     });

     var promise = mozNfcPeer.sendNDEF([NDEFRecord]);
     promise.catch(e => {
       console.error('Something goes wrong %s', e);
     });
  };

  var nfc_tools = {
    startListening: startListening,
    stopListening: stopListening
  };

  exports.NFC = nfc_tools;

}(window));
