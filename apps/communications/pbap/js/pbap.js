'use strict';

/*
 * Phone Book Access Profile (PBAP) is a profile that enables devcices to
 * exchange phonebook objects via Bluetooth. After a Bluetooth connection is
 * established, Phone-book objects each represent information about a contact
 * stored on a mobile phone. This PBAP server module will handle all PBAP
 * request from the client to response the phonebook records or list, and all
 * three kinds of request from the client are:
 * - pullphonebook - pull all phonebook records based on the constraint of the
 *   filter object.
 * - pullvcardentry - pull a specific contacts.
 * - pullvcardlisting - pull a XML format list of all contacts which filtered by
 *   a filter argument.
 */

 /* global ContactToVcardBlob, LazyLoader, PbapPhonebook */

(function (exports) {
  var managerBt = navigator.mozBluetooth;
  var adapter;
  var pb;

  function pbapInit() {
    pb = new PbapPhonebook();
    if (!managerBt) {
      console.error('PBAP', 'No Bluetooth Manager');
      return;
    }
    var req = managerBt.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      adapter = req.result;
      adapter.addEventListener('pullphonebookreq', pullphonebook);
      adapter.addEventListener('pullvcardentryreq', pullvcardentry);
      adapter.addEventListener('pullvcardlistingreq', pullvcardlisting);
    };
    req.onerror = function bt_getAdapterFailed() {
      console.error('PBAP', 'ERROR adapter');
    };
  }

  function pullphonebook(evt) {
    pb.sortAllContacts(evt).then((contacts) => {
      ContactToVcardBlob(contacts, function blobReady(vcardBlob) {
        evt.handle.replyToPhonebookPulling(vcardBlob, contacts.length);
      }, {
          // Some MMS gateways prefer this MIME type for vcards
          type: 'text/x-vcard'
      });
    });
  }

  function pullvcardentry(evt) {
    pb.pullVcardEntry(evt).then((contacts) => {
      ContactToVcardBlob(contacts, function blobReady(vcardBlob) {
        evt.handle.replyTovCardPulling(vcardBlob, contacts.length);
      }, {
          // Some MMS gateways prefer this MIME type for vcards
          type: 'text/x-vcard'
      });
    });
  }

  function pullvcardlisting(evt) {
    pb.pullVcardListing(evt).then((content) => {
      var blob = new Blob([content.xml], {
        type: 'text/xml'
      });
      evt.handle.replyTovCardListing(blob, content.size);
    });
  }

  LazyLoader.load([
                   '/shared/js/text_normalizer.js',
                   '/shared/js/contact2vcard.js'
                  ], () => {
    pbapInit();
    exports.pbap = {
      pullphonebook: pullphonebook,
      pullvcardentry: pullvcardentry,
      pullvcardlisting: pullvcardlisting
    };
  });
})(window);
