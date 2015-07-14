'use strict';

/* global utils */
/* global MatchService */
/* global ContactsService */
/* global LazyLoader */
/* global ContactToVcardBlob */
/* global VcardFilename */
/* global MozActivity */

/* exported Details */

/**
 * Adds functionality to the UI of this view
 */
(function(exports) {

  var _activity = null;

  function setActivity(activity) {
    _activity = activity;
  }

  function findDuplicates(evt) {
    if (!evt.detail || !evt.detail.contactId) {
      console.error('Missing parameters in CustomEvent');
      return;
    }

    var contactId = evt.detail.contactId;
    MatchService.match(contactId);
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

    ContactsService.save(
      utils.misc.toMozContact(contact),
      function(e) {
        if (typeof e !== 'undefined') {
          onError(e);
          return;
        }

        // TODO: Listening to oncontactchange event, we can save the evt
        // and send it via sessionStorage to the main list in order to
        // update it accordingly with the changes made by the user in this view.

        ContactsService.get(contact.id, function(savedContact) {
          dispatchEvent('toggleFavoriteDone', {contact: savedContact});
        }, onError);
      }
    );
  }

  function init() {
    window.addEventListener('backAction', handleBackAction);
    window.addEventListener('editAction', handleEditAction);
    window.addEventListener('toggleFavoriteAction', toggleFavorite);
    window.addEventListener('shareAction', shareContact);
    window.addEventListener('findDuplicatesAction', findDuplicates);

    // TODO: Need to save the oncontactchange event in order to update
    // the main list when the user go back from this view. It could be done
    // by saving the event in sessionStorage
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

  function handleEditAction(evt) {
    // In the future the navigation will change the URL to navigate
    // to #update view: Bug 1169579
  }

  function dispatchEvent(name, data) {
    window.dispatchEvent(new CustomEvent(name, {detail: data}));
  }

  exports.DetailsController = {
    'init': init,
    'setActivity': setActivity
  };
})(window);
