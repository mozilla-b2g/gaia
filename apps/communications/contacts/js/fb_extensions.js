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
        open('fb_link.html' + '?contactId=' + contactId);
      } else {
        doUnlink(contactId);
      }
    }

    extFb.importFB = function() {
      open('fb_import.html');
    }

    function open(uri) {
      extensionFrame.src = uri;
      extensionFrame.className = 'opening';
    }

    function close() {
      extensionFrame.addEventListener('transitionend', function closed() {
        extensionFrame.removeEventListener('transitionend', closed);
        extensionFrame.src = null;
      });
      extensionFrame.className = 'closing';
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
          close();

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
          close();
          if (data.from === 'import') {
            contacts.List.load();
          }
        break;

        case 'item_selected':
          var uid = data.data;
          doLink(uid);
        break;
      }
    });

  })(document);
}
