'use strict';

/* global LazyLoader, ContactToVcard, MozNDEFRecord, fb, Contacts */

var contacts = window.contacts || {};

contacts.NFC = (function() {
  var mozNfc = window.navigator.mozNfc;
  var currentContact;
  var vCardContact;
  var mozNfcPeer;
  var _ = navigator.mozL10n.get;

  var startListening = function(contact) {
    currentContact = contact;
    // We cannot share Facebook data via NFC so we check if the contact
    // is an FB contacts. However, if the contact is linked to a regular
    // mozContact, we can share linked data
    if (fb && !(fb.isFbContact(contact) && !fb.isFbLinked(contact))) {
      mozNfc.onpeerready = handlePeerReady;
    } else {
      mozNfc.onpeerready = handlePeerReadyForFb;
    }
  };

  var stopListening = function() {
    mozNfc.onpeerready = null;
    currentContact = null;
    vCardContact = null;
    mozNfcPeer = null;
  };

  var createBuffer = function nu_fromUTF8(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  };

  var handlePeerReady = function(event) {
    mozNfcPeer = mozNfc.getNFCPeer(event.detail);
      LazyLoader.load([
        '/shared/js/contact2vcard.js',
        '/shared/js/setImmediate.js'
        ], function() {
        ContactToVcard(
          [currentContact],
          function append(vcard) {
            vCardContact = vcard;
          },
          function success() {
            sendContact();
          },
          // use default batch size
          null,
          // We don't want to share a profile photo via NFC,
          // like on Android:
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1003767#c5
          true
        );
      });
  };

  var sendContact = function() {
     var NDEFRecord = new MozNDEFRecord(
       0x02,
       createBuffer('text/vcard'),
       createBuffer(''),
       createBuffer(vCardContact)
     );

     var res = mozNfcPeer.sendNDEF([NDEFRecord]);
     res.onsuccess = function() {
       console.log('Contact succesfuly sent');
     };

     res.onerror = function() {
       console.log('Something goes wrong');
     };
   };

  var handlePeerReadyForFb = function() {
    Contacts.showStatus(_('facebook-export-forbidden'));
  };

  return {
    startListening: startListening,
    stopListening: stopListening
  };
})();
