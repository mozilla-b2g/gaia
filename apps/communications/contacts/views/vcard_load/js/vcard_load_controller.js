/* global LazyLoader, ContactsService, Matcher, contacts */

(function(exports) {
  'use strict';
  var _activity;
  const STATUS_TIMEOUT = 3000; // ms before closing view which shows status msg

  function close() {
    if (_activity) {
      _activity.postResult({});
    } else {
      window.history.back();
    }
  }

  function importAll(evt) {
    if (!evt.detail.contactsToImport) {
      console.error('Missing parameter');
      return;
    }

    var contactsToImport = evt.detail.contactsToImport;

    var numDupsMerged = 0,
        importedContacts = 0,
        parsedContacts = 0;
    const DEPENDENCIES = [
      '/shared/js/contacts/import/utilities/status.js',
      '/shared/js/simple_phone_matcher.js',
      '/shared/js/contacts/contacts_matcher.js',
      '/shared/js/contacts/contacts_merger.js',
      '/shared/js/contacts/merger_adapter.js',
      '/contacts/services/contacts.js',
      '/shared/js/text_normalizer.js'
    ];
    LazyLoader.load(DEPENDENCIES, function() {
      contactsToImport.forEach((contact, index) => {
        Matcher.match(contact, 'passive', {
          onmatch: (matches) => {
            var callbacks = {
              success: () => {
                numDupsMerged++;
                doContinue(true);
              },
              error: doContinue
            };
            contacts.adaptAndMerge(contact, matches, callbacks);
          },
          onmismatch: () => {
            ContactsService.save(
              contact,
              function(e) {
                if (e) {
                  console.error(e);
                  doContinue();
                  return;
                }
                doContinue(true);
              }
            );
          }
        });
      });
    });

    function doContinue(isContactImported) {
      parsedContacts++;
      if (isContactImported) {
        importedContacts++;
      }

      if (contactsToImport.length <= parsedContacts) {
        window.dispatchEvent(new CustomEvent('showStatusAction', {
          'detail': {
            'numDups': numDupsMerged,
            'importedContacts': importedContacts
          }
        }));
        window.setTimeout(close, STATUS_TIMEOUT);
      }
    }
  }

  exports.VCardLoadController = {
    init: function() {
      window.addEventListener('closeAction', close);
      window.addEventListener('saveAction', importAll);
    },
    setActivity: function(activity) {
      _activity = activity;
    }
  };
})(window);
