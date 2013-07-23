'use strict';

var contacts = window.contacts || {};

if (!contacts.MatchingController) {
  contacts.MatchingController = (function() {

    var _ = navigator.mozL10n.get;

    var CONTACTS_APP_ORIGIN = 'app://communications.gaiamobile.org';

    var masterContact = null,
        matchings = {};

    window.addEventListener('localized', function localized(evt) {
      window.removeEventListener('localized', localized);
      // The controller is started when the literals are available
      start(window.location.search.substring('contactId'.length + 2));
    });

    function start(cid) {
      Curtain.show('wait', 'duplicateContacts');

      // Finding duplicate contacts
      var callbacks = {
        onmatch: function(results) {
          // Save reference for merging after checking duplicate contacts
          matchings = results;
          LazyLoader.load('/contacts/js/contacts_matching_ui.js',
                          function done() {
            contacts.MatchingUI.load(masterContact, results, function() {
              // We start the open-animation when the UI is ready
              Curtain.hide(function() {
                parent.postMessage({
                  type: 'ready',
                  data: ''
                }, CONTACTS_APP_ORIGIN);
              });
            });
          });
        },
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
                                 '/contacts/js/contacts_matcher.js'];
      LazyLoader.load(matcherDependencies, function loaded() {
        parent.contacts.List.getContactById(cid, function success(contact) {
          masterContact = contact;
          contacts.Matcher.match(contact, 'active', callbacks);
        }, abort);
      });
    }

    function abort() {
      Curtain.hide();

      parent.postMessage({
        type: 'abort',
        data: ''
      }, CONTACTS_APP_ORIGIN);
    }

    function merge(checkedContacts) {
      Curtain.show('wait', 'mergingDuplicateContacts');
      Curtain.hideMenu(); // Hide cancel button

      LazyLoader.load('/contacts/js/contacts_merger.js', function loaded() {
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

        contacts.Merger.merge(masterContact, list, {
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
