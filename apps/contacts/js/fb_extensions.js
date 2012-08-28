var Contacts = window.Contacts || {};

if (typeof Contacts.extFb === 'undefined') {
  (function(document) {
    var extFb = Contacts.extFb = {};
    var contactid;

    var linkProposal = document.querySelector('#fb-extensions');

    extFb.startLink = function(cid, linked) {
      contactid = cid;
      if (linked === 'true') {
        linkProposal.src = 'fb_link.html' + '?contactid=' + contactid;
        linkProposal.hidden = false;
      }
      else {
        doUnlink(contactid);
      }
    }

    function doLink(uid) {
      // We need to obtain the mozContact id for the UID
      var mozContReq = fb.utils.getMozContact(uid);

      mozContReq.onsuccess = function() {
        // contactid is the device contact about to be linked
        var fbContact = new fb.Contact(null, contactid);

        // mozContactReq.result is id in mozContacts for that UID
        var originalFbContact = mozContReq.result;

        var req = fbContact.linkTo(
                            {uid: uid, mozContact: originalFbContact});

        req.onsuccess = function() {
          linkProposal.hidden = true;

          contacts.List.refresh(contactid);
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

      if (data === 'window_close') {
        linkProposal.src = null;
        linkProposal.hidden = true;
      }
      else if (data.type && data.type === 'item_selected') {
        // The selection made by the user
        var uid = data.data;

        doLink(uid);
      }
    });

  })(document);
}
