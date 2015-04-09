/* global _ */
/* global ContactToVcard */
/* global getUnusedFilename */

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
    return false;
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

  var getStorage = function getStorage(fileName) {
    return new Promise((resolve, reject) => {
      var storage = navigator.getDeviceStorage('sdcard');
      getUnusedFilename(storage, fileName, name => {
        resolve({
          storage: storage,
          fileName: name
        });
      });
    });
  };

  var cancelExport = function cancelExport() {
    cancelled = true;
  };

  var cleanup = (storage, fileName) => {
    storage.delete(fileName).onerror = event => {
      console.error('Clean up error', event.error.name);
    };
  };

  var doExport = function doExport(finishCallback) {
    if (typeof finishCallback !== 'function') {
      throw new Error('SD export requires a callback function');
    }

    getStorage(getFileName()).then(response => {
      var storage = response.storage;
      var fileName = response.fileName;
      // Sadly we have to create an empty file first as appendNamed does not
      // create it.
      var file = new Blob([''], {type: 'text/vcard'});
      var request = storage.addNamed(file, fileName);
      request.onsuccess = () => {
        _doExport(finishCallback, storage, request.result);
      };
      request.onerror = () => {
        console.error('Export error', request.error.name);
        finishCallback({ 'reason': request.error.name }, 0, true);
      };
    });
  };

  var _doExport = function _doExport(finishCallback, storage, fileName) {
    /* XXX: We use a batch-conversion size of 2MiB. This ensures that the
     * process won't go out of memory even on low-end devices. This should be
     * revisited once append-to-file functionality becomes available. */
    var batchSize = 2 * 1024 * 1024;
    var count = 0;
    var pendingBatches = 0;
    var done = false;
    var cancelButton = document.querySelector('#cancel-overlay');

    ContactToVcard(contacts, (vcards, nCards) => {
      if (cancelled) {
        finishCallback(null, 0);
        return;
      }

      var blob = new Blob([vcards], {'type': 'text/vcard'});

      pendingBatches++;

      cancelButton.disabled = true;
      var request = storage.appendNamed(blob, fileName);
      request.onsuccess = () => {
        count += nCards;
        pendingBatches--;

        if (done && (pendingBatches === 0)) {
          finishCallback(null, count, false);
        }
      };
      request.onerror = () => {
        console.error('Export error', request.error.name);
        cleanup(storage, fileName);
        finishCallback({ 'reason': request.error.name }, count, true);
      };
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
