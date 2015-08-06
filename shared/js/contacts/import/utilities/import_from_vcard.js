/* global VCardReader, ConfirmDialog, contacts, LazyLoader, Loader */
/* global Matcher */
'use strict';

var utils = window.utils || {};

/**
 * Loads the file passed on the activity, reads the text from it, and
 * import the info
 * Passes the id of last imported contact in the callback
 */
utils.importFromVcard = function(file, callback) {

  var MERGE_DEPENDENCIES = [
    '/shared/js/simple_phone_matcher.js',
    '/shared/js/contacts/merger_adapter.js',
    '/shared/js/contacts/contacts_merger.js',
    '/shared/js/contacts/contacts_matcher.js'
  ];

  Loader.utility('Overlay', function() {
    LazyLoader.load(MERGE_DEPENDENCIES, _loaded);
  });

  function _loaded() {
    var importedContacts = 0;
    var cancelled = false;
    var importer = null;
    var text = null;
    var progress = utils.overlay.show(
                   'memoryCardContacts-reading',
                   'activityBar',
                   null,
                   true
                 );

    utils.overlay.oncancel = function oncancel() {
      cancelled = true;
      if (importer) {
        importer.finish();
      } else {
        utils.overlay.hide();
      }
    };

    readVCard(function(vcardText) {
      if (vcardText) {
        processTextFromFile(vcardText);
      } else {
        callback();
      }
    });

    function readVCard(cb) {
      var reader;

      if (typeof file === 'string') {
        cb(file);
      } else {
        reader = new FileReader();
        reader.onloadend = function() {
          text = reader.result;
          if (text) {
            cb(text);
          }
        };

        try {
          reader.readAsText(file);
        }
        catch (ex) {
          console.error('Error reading the file ' + ex.message);
          import_error();
          cb();
        }
      }
    }

    function processTextFromFile(textFromFile) {
      if (cancelled) {
        return;
      }

      var reader = new VCardReader(textFromFile);
      var match = textFromFile && textFromFile.match(/END:VCARD/g);
      var cursor = reader.getAll();
      var numContacts = match ? match.length : 0;
      var numDupsMerged = 0;
      var firstContact = null;

      var _doContinue = function(savedContact) {
        if (savedContact) {
          if (!firstContact) {
            firstContact = savedContact;
          }
          imported_contact();
        }
        if (!cancelled) {
          cursor.continue();
        }
      };

      cursor.onsuccess = function(evt) {
        if (evt.target.result) {
          var contact = evt.target.result;

          Matcher.match(contact, 'passive', {
            onmatch: function(matches) {
              var callbacks = {
                success: function(mergedContact) {
                  numDupsMerged++;
                  _doContinue(mergedContact);
                },
                error: _doContinue
              };
              contacts.adaptAndMerge(contact, matches, callbacks);
            },
            onmismatch: function() {
              var req = navigator.mozContacts.save(contact);
              req.onsuccess = function() {
                _doContinue(contact);
              };
            }
          });

        // No more contacts
        } else {
          utils.overlay.hide();
          if (!cancelled) {
            var msgImported = {
              id: 'memoryCardContacts-imported3',
              args: {n: importedContacts}
            };
            var msgDupsMerged = numDupsMerged ? {
              id: 'contactsMerged',
              args: {numDups: numDupsMerged}
            } : null;

            utils.status.show(msgImported, msgDupsMerged);
          }
          if (importedContacts > 0) {
            callback(importedContacts, firstContact.id);
          } else {
            callback(importedContacts);
          }
        }
      };

      import_read(numContacts);
    }

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg('memoryCardContacts-importing');
      progress.setTotal(n);
    }

    function imported_contact() {
      importedContacts++;
      if (!cancelled) {
        progress.update();
      }
    }

    function import_error(e) {
      console.error('Error importing from vcard: ' + e.message);
      // Showing error message allowing user to retry
      var cancel = {
        title: 'cancel',
        callback: function() {
          ConfirmDialog.hide();
        }
      };

      var retry = {
        title: 'retry',
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          processTextFromFile(text);
        }
      };
      ConfirmDialog.show(null, 'memoryCardContacts-error',
                             cancel, retry);
      utils.overlay.hide();
    }
  }
};
