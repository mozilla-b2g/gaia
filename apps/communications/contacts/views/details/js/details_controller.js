'use strict';

/* global utils */
/* global MatchService */
/* global ContactsService */
/* global LazyLoader */
/* global ContactToVcardBlob */
/* global VcardFilename */
/* global MozActivity */
/* global ParamUtils */

/* exported Details */

/*
 * Once the deatils view is loaded, we will listen events dispatched
 * from the UI. This events will come with the info needed in order
 * to execute actions related with the UI (back, toggle favorite, share...).
 *
 * Controller will *not* contain any code related with the DOM/UI,
 * and will rely on the info provided by the event.
 */
(function(exports) {

  var _activity = null;
  var _contactID;

  function setActivity(activity) {
    _activity = activity;
  }

  function findDuplicates(evt) {
    if (!evt.detail || !evt.detail.contactId) {
      console.error('Missing parameters in CustomEvent');
      return;
    }

    var contactId = evt.detail.contactId;
    var dependencies = [
      '/contacts/js/match_service.js'
    ];

    LazyLoader.load(
      dependencies,
      function onLoaded() {
        MatchService.match(contactId);
      }
    );
  }

  function listenContactChanges() {
    return new Promise(function(resolve, reject) {
      ContactsService.addListener('contactchange',
        function oncontactchange(event) {
          ContactsService.removeListener('contactchange', oncontactchange);

          var eventToSave = {
            contactID: event.contactID,
            reason: event.reason
          };
          
          var events = [];
          events.unshift(eventToSave);
          sessionStorage.setItem('contactChanges', JSON.stringify(events));
          resolve();
        }
      );
    });
  }

  function toggleFavorite(evt){
    if (!evt.detail || typeof evt.detail.contact === 'undefined' ||
      typeof evt.detail.isFavorite === 'undefined') {
      console.error('Missing parameters in CustomEvent');
      return;
    }

    var contact = evt.detail.contact;
    var isFavorite = evt.detail.isFavorite;
    var favorite = !isFavorite;
    if (favorite) {
      contact.category = contact.category || [];
      contact.category.push('favorite');
    } else {
      if (!contact.category) {
        return;
      }
      var pos = contact.category.indexOf('favorite');
      if (pos > -1) {
        contact.category.splice(pos, 1);
      }
    }

    function onError(e) {
      console.error('Error saving favorite');
      // We must restore contact in order to update the UX accordingly
      if (favorite) {
        var pos = contact.category.indexOf('favorite');
        if (pos > -1) {
          contact.category.splice(pos, 1);
        }
      } else {
        contact.category = contact.category || [];
        contact.category.push('favorite');
      }

      dispatchEvent('toggleFavoriteDone', {contact: contact});
    }

    // Listening to oncontactchange event, we can save the evt
    // and send it via sessionStorage to the main list in order to
    // update it accordingly with the changes made by the user in this view.

    listenContactChanges().then(function() {
      ContactsService.get(contact.id, function(savedContact) {
        dispatchEvent('toggleFavoriteDone', {contact: savedContact});
      }, onError);
    });

    // Save contact with 'favourite' param updated properly
    ContactsService.save(
      utils.misc.toMozContact(contact),
      function(e) {
        if (typeof e !== 'undefined') {
          onError(e);
          return;
        }
      }
    );
  }

  function init() {
    window.addEventListener('backAction', handleBackAction);
    window.addEventListener('editAction', handleEditAction);
    window.addEventListener('toggleFavoriteAction', toggleFavorite);
    window.addEventListener('shareAction', shareContact);
    window.addEventListener('findDuplicatesAction', findDuplicates);
  }

  function shareContact(evt) {
    const VCARD_DEPS = [
      '/shared/js/text_normalizer.js',
      '/shared/js/contact2vcard.js',
      '/shared/js/setImmediate.js'
    ];

    if (!evt.detail || typeof evt.detail.contact === 'undefined') {
      console.error('Missing parameters in CustomEvent');
      return;
    }

    var contact = evt.detail.contact;

    LazyLoader.load(VCARD_DEPS,function vcardLoaded() {
      ContactToVcardBlob([contact], function blobReady(vcardBlob) {
        var filename = VcardFilename(contact);
         /* jshint nonew: false */
        new MozActivity({
          name: 'share',
          data: {
            type: 'text/vcard',
            number: 1,
            blobs: [new window.File([vcardBlob], filename)],
            filenames: [filename]
          }
        });
        // The MIME of the blob should be this for some MMS gateways
      }, { type: 'text/x-vcard'} );
    });
  }

  function handleBackAction(evt) {
    if (_activity) {
      _activity.postResult({});
    } else {
      window.history.back();
    }
  }

  function setContact(contactID) {
    _contactID = contactID;
  }

  function handleEditAction(evt) {
    window.location.href = ParamUtils.generateUrl(
      'form',
      {
        'action': 'update',
        'contact': _contactID
      }
    );
  }

  function dispatchEvent(name, data) {
    window.dispatchEvent(new CustomEvent(name, {detail: data}));
  }

  exports.DetailsController = {
    'init': init,
    'setActivity': setActivity,
    'setContact': setContact
  };
})(window);
