'use strict';

/* global LazyLoader, ContactToVcard, MozNDEFRecord */

var contacts = window.contacts || {};

contacts.NFC = (function() {
  var mozNfc = window.navigator.mozNfc;
  var currentContact;
  var vCardContact;
  var mozNfcPeer;

  var startListening = function(contact) {
    currentContact = contact;
    mozNfc.onpeerready = handlePeerReady;
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
          }
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

  return {
    startListening: startListening,
    stopListening: stopListening
  };
})();
