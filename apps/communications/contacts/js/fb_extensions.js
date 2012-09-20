'use strict';

var Contacts = window.Contacts || {};

if (typeof Contacts.extFb === 'undefined') {
  (function(document) {
    var extFb = Contacts.extFb = {};
    var contactId;

    var extensionFrame = document.querySelector('#fb-extensions');

    extFb.startLink = function(cid, linked) {
      contactId = cid;
      if (linked === 'true') {
        extensionFrame.src = 'fb_link.html' + '?contactId=' + contactId;
        extensionFrame.hidden = false;
      } else {
        doUnlink(contactId);
      }
    }

    extFb.importFB = function() {
      extensionFrame.src = 'fb_import.html';
      extensionFrame.hidden = false;
    }

    function doLink(uid) {
      // We need to obtain the mozContact id for the UID
      var mozContReq = fb.utils.getMozContact(uid);

      mozContReq.onsuccess = function() {
        // contactId is the device contact about to be linked
        var fbContact = new fb.Contact(null, contactId);

        // mozContactReq.result is id in mozContacts for that UID
        var originalFbContact = mozContReq.result;

        var req = fbContact.linkTo({
          uid: uid,
          mozContact: originalFbContact
        });

        req.onsuccess = function success() {
          extensionFrame.hidden = true;

          contacts.List.refresh(contactId);
          if (originalFbContact) {
            contacts.List.remove(originalFbContact.id);
          }
          Contacts.navigation.home();
        }

        req.onerror = function() {
           window.console.error('FB: Error while linking contacts', req.error);
        }
      }

      mozContReq.onerror = function() {
         window.console.error('FB: Error while linking contacts',
                              mozContReq.error);
      }
    }

    function doUnlink(cid) {
      var fbContact = new fb.Contact(null, cid);

      var freq = fbContact.unlink();

      freq.onsuccess = function() {
        contacts.List.refresh(cid);
        contacts.List.refresh(freq.result);
        Contacts.navigation.home();
      }

      freq.onerror = function() {
        window.console.error('FB: Error while unlinking', freq.error);
      }
    }

    window.addEventListener('message', function(e) {
      var data = e.data;

      switch (data.type) {
        case 'window_close':
          extensionFrame.src = null;
          extensionFrame.hidden = true;
        break;

        case 'item_selected':
          var uid = data.data;
          doLink(uid);
        break;
      }
    });

  })(document);
}
