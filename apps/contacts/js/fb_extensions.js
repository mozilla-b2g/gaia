var Contacts = window.Contacts || {};

if(typeof Contacts.extFb === 'undefined') {
  (function(document) {
    var extFb = Contacts.extFb = {};
    var contactid;

    var linkProposal = document.querySelector('#fb-extensions');

    extFb.startLink = function(cid) {
      contactid = cid;
      linkProposal.src = 'fb_link.html' + '?contactid=' + contactid;
      linkProposal.hidden = false;
    }

    window.addEventListener('message',function(e) {
      var data = e.data;

      if(data === 'window_close') {
        linkProposal.hidden = true;
      }
      else if(data.type && data.type === 'item_selected') {
        // The selection made by the user
        var uid = data.data;
        var fbContact = new fb.Contact(null,contactid);
        var req = fbContact.linkTo({uid: uid});

        req.onsuccess = function() {
          linkProposal.hidden = true;
          contacts.List.refresh(contactid);
          Contacts.navigation.home();
        }

        req.onerror = function() {
          window.console.log('FB: Error while linking contacts',req.error);
        }
      }
    });

  })(document);
}
