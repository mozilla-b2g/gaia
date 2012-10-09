'use strict';

var Contacts = window.Contacts || {};

if (typeof Contacts.extFb === 'undefined') {
  (function(document) {
    var extFb = Contacts.extFb = {};
    var contactId;

    var extensionFrame = document.querySelector('#fb-extensions');

    extFb.startLink = function(cid, linked) {
      contactId = cid;
      if (!linked) {
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

    extFb.initEventHandlers = function(socialNode, contact, linked) {
      var elements = {
        '#msg_button': {
          'elems': ['id'],
          'callback': onPrivateMsgClick
        },
        '#wall_button': {
          'elems': ['id'],
          'callback': onWallClick
        },
        '#profile_button': {
          'elems': ['id'],
          'callback': onProfileClick
        },
        '#link_button': {
          'elems': ['id', 'fb_is_linked'],
          'callback': onLinkClick
        }
      };

      // Add extra info too
      var extras = {};
      extras['fb_is_linked'] = linked;

      for (var nodeName in elements) {
        var node = socialNode.querySelector(nodeName);
        var variables = elements[nodeName].elems;
        variables.forEach(function appendData(data) {
          var value = contact[data] || extras[data];
          node.dataset[data] = value;
        });
        node.addEventListener('click', elements[nodeName].callback);
      }
    }

    function onClickWithId(evt, callback) {
      var contactId = evt.target.dataset['id'];
      callback(contactId);
    }

    /*
      The following functons are similar,
      but have been splitted for better reading
      and future different handling
    */
    function onPrivateMsgClick(evt) {
      onClickWithId(evt, extFb.sendPrivateMsg);
    }

    function onWallClick(evt) {
      onClickWithId(evt, extFb.wallPost);
    }

    function onProfileClick(evt) {
      onClickWithId(evt, extFb.showProfile);
    }

    // Note this is slightly different
    function onLinkClick(evt) {
      var contactId = evt.target.dataset['id'];
      var linked = evt.target.dataset['fb_is_linked'];

      linked = (linked === 'true');
      extFb.startLink(contactId, linked);
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
        if (freq.result) {
          contacts.List.refresh(freq.result);
        }
        Contacts.navigation.home();
      }

      freq.onerror = function() {
        window.console.error('FB: Error while unlinking', freq.error);
      }
    }

    function notifySettings() {
       // Notify observers that a change from FB could have happened
      var event = new CustomEvent('fb_imported', {
        'detail' : true
      });

      document.dispatchEvent(event);
    }

    // This function can also be executed when other messages arrive
    // That's why we cannot call notifySettings outside the switch block
    window.addEventListener('message', function(e) {
      var data = e.data;

      switch (data.type) {
        case 'window_close':
          close(data.from);
          if (data.from === 'import') {
            contacts.List.load();
          }

          notifySettings();
        break;

        case 'item_selected':
          var uid = data.data;
          doLink(uid);

          notifySettings();
        break;
      }

    });

  })(document);
}
