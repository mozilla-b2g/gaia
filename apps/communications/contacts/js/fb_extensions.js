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
      open('fb_import.html', 'import');
    }

    function open(uri, target) {
      extensionFrame.addEventListener('transitionend', function topen() {
        extensionFrame.removeEventListener('transitionend', topen);
        extensionFrame.src = uri;
      });
      extensionFrame.className = (target === 'import') ?
                                  'openingImport' : 'opening';
    }

    function close(target) {
      extensionFrame.addEventListener('transitionend', function tclose() {
        extensionFrame.removeEventListener('transitionend', tclose);
        extensionFrame.src = null;
      });
      extensionFrame.className = (target === 'import') ?
                                  'closingImport' : 'closing';
    }

    function openURL(url) {
      window.open(url);
    }

    extFb.showProfile = function(cid) {
      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        var fbContact = new fb.Contact(req.result);

        var uid = fbContact.uid;
        var profileUrl = 'http://m.facebook.com/' + uid;

        openURL(profileUrl);
      }

      req.onerror = function() {
        window.console.error('Contacts FB Profile: Contact not found');
      }
    }

    extFb.wallPost = function(cid) {
      contactId = cid;
      fb.msg.ui.wallPost(contactId);
    }

    extFb.sendPrivateMsg = function(cid) {
      contactId = cid;
      fb.msg.ui.sendPrivateMsg(contactId);
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
          // Notify observers that the import happened
          var event = new CustomEvent('fb_imported',
            {'detail' : true }
          );
          document.dispatchEvent(event);
          close(data.from);
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
