'use strict';

var contacts = window.contacts || {};

if (!contacts.MatchingController) {
  contacts.MatchingController = (function() {

    var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

    var contact = null,
        matchings = {};

    /*
     * This library implements two modes of work ('matching' by default):
     *
     * 1) 'matching': find duplicates adding a contact trigger that checks for
     *                duplicates. If there are duplicates, it shows them in a
     *                list where users are able to check what contacts will be
     *                finally merged.
     *
     * 2) 'listing':  this library shows a list of contacts received from the
     *                caller by means of a postMessage mechanism. Users can
     *                check what contacts will be merged but this action will be
     *                performed by the caller. Basically the library sends the
     *                list of identifiers to the caller by the same mechanism.
     */
    var type = 'matching';

    window.addEventListener('localized', function localized(evt) {
      window.removeEventListener('localized', localized);
      // The controller is started when the literals are available
      start(window.location.search.substring('contactId'.length + 2));
    });

    function start(cid) {
      if (!cid) {
        type = 'listing';
        window.addEventListener('message', duplicateContactsHandler);
        parent.postMessage({
          type: 'duplicate_contacts_loaded'
        }, CONTACTS_APP_ORIGIN);
        return;
      }

      Curtain.show('wait', 'duplicateContacts');

      // Finding duplicate contacts
      var callbacks = {
        onmatch: showUI,
        onmismatch: function() {
          Curtain.show('alert', 'noDuplicateContacts');
          Curtain.onok = abort;
        }
      };

      Curtain.oncancel = function oncancel() {
        // Removing callbacks
        callbacks.onmatch = callbacks.onmismatch = null;
        abort();
      };

      var matcherDependencies = ['/shared/js/text_normalizer.js',
                                 '/shared/js/simple_phone_matcher.js',
                                 '/contacts/js/contacts_matcher.js'];
      LazyLoader.load(matcherDependencies, function loaded() {
        parent.contacts.List.getContactById(cid, function success(mContact) {
          // Master contact
          contact = mContact;
          contacts.Matcher.match(contact, 'active', callbacks);
        }, abort);
      });
    }

    function duplicateContactsHandler(e) {
      if (e.origin !== CONTACTS_APP_ORIGIN) {
        return;
      }

      var data = e.data;

      if (data && data.type === 'show_duplicate_contacts') {
        window.removeEventListener('message', duplicateContactsHandler);

        // Incoming contact
        contact = {
          name: [data.data.name]
        };
        var duplicateContacts = data.data.duplicateContacts;
        var total = Object.keys(duplicateContacts).length;
        var matchingReady = function() {
          if (--total === 0) {
            window.addEventListener('message', contactsMergedHandler);
            showUI(duplicateContacts);
          }
        };

        Object.keys(duplicateContacts).forEach(function(cid) {
          parent.contacts.List.getContactById(cid, function success(contact) {
            duplicateContacts[cid] = {
              matchingContact: contact,
              matchings: duplicateContacts[cid].matchings
            };
            matchingReady();
          }, matchingReady);
        });
      }
    }

    function contactsMergedHandler(e) {
      if (e.origin !== CONTACTS_APP_ORIGIN) {
        return;
      }

      if (e.data && e.data.type === 'duplicate_contacts_merged') {
        window.removeEventListener('message', contactsMergedHandler);

        Curtain.hide(function() {
          parent.postMessage({
            type: 'window_close',
            data: ''
          }, CONTACTS_APP_ORIGIN);
        });
      }
    }

    function showUI(results) {
      matchings = results;
      LazyLoader.load(['/contacts/js/contacts_matching_ui.js',
                       '/shared/js/contact_photo_helper.js'],
                        function done() {
        contacts.MatchingUI.load(type, contact, results, function() {
          // We start the open-animation when the UI is ready
          if (type === 'matching') {
            Curtain.hide(sendReadyEvent, CONTACTS_APP_ORIGIN);
          } else {
            sendReadyEvent();
          }
        });
      });
    }

    function sendReadyEvent() {
      parent.postMessage({
        type: 'ready',
        data: ''
      }, CONTACTS_APP_ORIGIN);
    }

    function abort() {
      var notifyParent = function cmc_notifyParent() {
        parent.postMessage({
          type: 'abort',
          data: ''
        }, CONTACTS_APP_ORIGIN);
      };
      Curtain.hide(notifyParent);
    }

    function merge(checkedContacts) {
      Curtain.show('wait', 'mergingDuplicateContacts');
      Curtain.hideMenu(); // Hide cancel button

      if (type === 'listing') {
        // Delegating the merge action to caller and this is the end
        parent.postMessage({
          type: 'merge_duplicate_contacts',
          data: checkedContacts
        }, CONTACTS_APP_ORIGIN);
        return;
      }

      LazyLoader.load(['/contacts/js/contacts_merger.js',
                       '/contacts/js/utilities/image_thumbnail.js'],
      function loaded() {
        var cb = function cb() {
          Curtain.hide(function() {
            parent.postMessage({
              type: 'window_close',
              data: ''
            }, CONTACTS_APP_ORIGIN);
          });
        };

        var list = [];
        Object.keys(checkedContacts).forEach(function(id) {
          list.push(matchings[id]);
        });

        // Here contact is the master contact
        contacts.Merger.merge(contact, list, {
          success: cb,
          error: function(e) {
            console.error('Failed merging duplicate contacts: ', e.name);
            cb();
          }
        });
      });
    }

    return {
      /*
       * Merges the master contact with the duplicate contacts checked by the
       * user
       *
       * @param{Object} Hash contains identifiers of checked contacts
       *
       */
      merge: merge
    };

  })();
}
