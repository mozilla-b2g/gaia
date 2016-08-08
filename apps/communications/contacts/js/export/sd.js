/* globals _, ContactToVcard, getStorageIfAvailable, getUnusedFilename
*/

/* exported ContactsSDExport */

'use strict';

var ContactsSDExport = function ContactsSDExport() {

  var contacts;
  var progressStep;
  var cancelled = false;

  var setContactsToExport = function setContactsToExport(cts) {
    contacts = cts;
  };

  var hasDeterminativeProgress = function hasDeterminativeProgress() {
    return true;
  };

  var setProgressStep = function setProgressStep(p) {
    progressStep = p;
  };

  var getExportTitle = function getExportTitle() {
    return 'memoryCardExport-title';
  };

  var hasGivenName = function hasGivenName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
            contact.givenName[0].trim());
  };

  var hasFamilyName = function hasFamilyName(contact) {
    return (Array.isArray(contact.familyName) && contact.familyName[0] &&
            contact.familyName[0].trim());
  };

  var getFileName = function getFileName() {
    var filename = [];
    if (contacts && contacts.length === 1) {
      var contact = contacts[0],
          hasName = false;
      if (hasGivenName(contact)) {
        filename.push(contact.givenName[0]);
        hasName = true;
      }
      if (hasFamilyName(contact)) {
        filename.push(contact.familyName[0]);
        hasName = true;
      }
      if (!hasName) {
        if (contact.org && contact.org.length > 0) {
          filename.push(contact.org[0]);
        } else if (contact.tel && contact.tel.length > 0) {
          filename.push(contact.tel[0].value);
        } else if (contact.email && contact.email.length > 0) {
          filename.push(contact.email[0].value);
        } else {
          filename.push(_('noName'));
        }
      }
    } else {
      var today = new Date();
      filename.push(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate(),
        contacts.length
      );
    }

    return filename.join('_')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase() +
      '.vcf';
  };

  var getStorage = function getStorage(fileName, blob, callback) {
    getStorageIfAvailable('sdcard', blob.size,
      function onSuccess(storage) {
        // Get the final version of the proposed file name
        getUnusedFilename(storage, fileName, function onFinalName(name) {
          callback(null, storage, name);
        });
      },
      function onError(type) {
        callback(type);
      }
    );
  };

  var cancelExport = function cancelExport() {
    cancelled = true;
  };

  var doExport = function doExport(finishCallback) {
    /* XXX: We use a batch-conversion size of 2MiB. This ensures that the
     * process won't go out of memory even on low-end devices. This should be
     * revisited once append-to-file functionality becomes available. */
    var batchSize = 2 * 1024 * 1024;
    var count = 0;
    var pendingBatches = 0;
    var done = false;
    var cancelButton = document.querySelector('#cancel-overlay');

    if (typeof finishCallback !== 'function') {
      throw new Error('SD export requires a callback function');
    }

    ContactToVcard(contacts, function onContacts(vcards, nCards) {
      if (cancelled) {
        finishCallback(null, 0);
        return;
      }
      var blob = new Blob([vcards], {'type': 'text/vcard'});

      pendingBatches++;

      getStorage(getFileName(), blob,
        function onStorage(error, storage, finalName) {
          if (error !== null) {
            var reason = error;
            // numeric error means not enough space available
            if (parseInt(error, 10) >= 0) {
              reason = 'noSpace';
            }
            finishCallback({
              'reason': reason
            }, count, true);
            return;
          }
          if (cancelled) {
            finishCallback(null, 0);
            return;
          }
          cancelButton.disabled = true;
          var request = storage.addNamed(blob, finalName);
          request.onsuccess = function onSuccess() {
            count += nCards;
            pendingBatches--;

            if (done && (pendingBatches === 0)) {
              finishCallback(null, count, false);
            }
          };
          request.onerror = function onError(e) {
            finishCallback({ 'reason': e }, count, true);
          };
        });
    }, function finish() {
      done = true;
    }, batchSize);
  };

  return {
    'setContactsToExport': setContactsToExport,
    'shouldShowProgress': function shouldShowProgress() { return true; },
    'hasDeterminativeProgress': hasDeterminativeProgress,
    'getExportTitle': getExportTitle,
    'doExport': doExport,
    'setProgressStep': setProgressStep,
    'cancelExport': cancelExport,
    get name() { return 'SD'; } // handling error messages on contacts_exporter
  };

};
