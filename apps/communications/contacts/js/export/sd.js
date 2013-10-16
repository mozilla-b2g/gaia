var ContactsSDExport = function ContactsSDExport() {

  var contacts;
  var progressStep;
  var exported = [];
  var notExported = [];

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
    return _('sdExport-title');
  };

  var hasName = function hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  };

  var getFileName = function getFileName() {
    var filename = [];
    if (contacts && contacts.length === 1) {
      var contact = contacts[0];
      if (hasName(contact)) {
        filename.push(contact.givenName[0], contact.familyName[0]);
      } else {
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
        today.getDate(),
        today.getMonth() + 1,
        today.getFullYear(),
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

  var saveToSdcard = function saveToSdcard(storage, name, blob, callback) {
    var request = storage.addNamed(blob, name);
    request.onsuccess = function onSuccess() {
      callback(null, contacts.length, null);
    };
    request.onerror = function onError(e) {
      callback({
        'reason': e
      }, 0, e.message);
    };
  };

  var doExport = function doExport(finishCallback) {
    if (typeof finishCallback !== 'function') {
      throw new Error('SD export requires a callback function');
    }

    ContactToVcardBlob(contacts, function onContacts(blob) {
      getStorage(getFileName(), blob, function onStorage(error,
        storage, finalName) {
        if (error) {
          var reason = error;
          // numeric error means not enough space available
          if (parseInt(error, 10) > 0) {
            reason = 'noSpace';
          }
          finishCallback({
            'reason': reason
          }, 0, error.message);
          return;
        }

        saveToSdcard(storage, finalName, blob, finishCallback);
      });
    });
  };

  return {
    'setContactsToExport': setContactsToExport,
    'shouldShowProgress': function() { return true },
    'hasDeterminativeProgress': hasDeterminativeProgress,
    'getExportTitle': getExportTitle,
    'doExport': doExport,
    'setProgressStep': setProgressStep,
    get name() { return 'SD';} // handling error messages on contacts_exporter
  };

};
