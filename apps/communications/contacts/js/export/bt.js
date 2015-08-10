/* global getStorageIfAvailable, getUnusedFilename, ContactToVcardBlob,
    MozActivity */

/* exported ContactsBTExport */
'use strict';

var ContactsBTExport = function ContactsBTExport() {
  var contacts;
  var progressStep;
  var cancelled = false;
  var _ = navigator.mozL10n.get;

  var _setContactsToExport = function btex_setContactsToExport(cts) {
    contacts = cts;
  };

  var _hasDeterminativeProgress = function btex_hasDeterminativeProgress() {
    return false;
  };

  var _getExportTitle = function btex_getExportTitle() {
    return 'btExport-title';
  };

  var _setProgressStep = function btex_setProgressStep(p) {
    progressStep = p;
  };

  var _getGivenName = function _getGivenName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim());
  };
  var _getLastName = function _getLastName(contact) {
    return (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  };
  var _getFileName = function _getFileName() {
    var filename = [];
    if (contacts && contacts.length === 1) {
      var contact = contacts[0],
          givenName = _getGivenName(contact),
          lastName = _getLastName(contact);
      if (givenName) {
        filename.push(givenName);
      }
      if (lastName) {
        filename.push(lastName);
      }
      if (filename.length === 0) {
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
  var _getStorage = function _getStorage(fileName, blob, callback) {
    if (typeof callback !== 'function') {
      throw new Error('getStorage requires a callback function');
    }
    getStorageIfAvailable('sdcard', blob.size,
      function onSuccess(storage) {
        // Get the final version of the proposed file name
        getUnusedFilename(storage, fileName, function onfilename(name) {
          callback(null, storage, name);
        });
      },
      callback //onerror
    );
  };
  var _saveToSdcard = function _saveToSdcard(storage, name, blob, callback) {
    if (typeof callback !== 'function') {
      throw new Error('saveToSDcard requires a callback function');
    }

    var request = storage.addNamed(blob, name);
    request.onsuccess = function(evt) {
      callback(null, evt.target.result); // returns the full filepath
    };
    request.onerror = callback;
  };
  var _getFile = function _getFile(storage, filename, callback) {
    if (typeof callback !== 'function') {
      throw new Error('getFile requires a callback function');
    }
    var request = storage.get(filename);
    request.onsuccess = function() {
      callback(null, request.result); // returns a File object
    };
    request.onerror = callback;
  };

  var cancelExport = function cancelExport() {
    cancelled = true;
  };

  var _doExport = function btex_doExport(finishCallback) {
    if (typeof finishCallback !== 'function') {
      throw new Error('BT export requires a callback function');
    }

    var checkError = function checkError(error) {
      if (error === null) {
        return false;
      }
      var reason = error;
      // numeric error means not enough space available
      if (parseInt(error, 10) >= 0) {
        reason = 'noSpace';
      }
      finishCallback({ 'reason': reason }, 0, false);
      return true;
    };

    ContactToVcardBlob(contacts, function onContacts(blob) {
      if (cancelled) {
        finishCallback(null, 0, false);
        return;
      }
      _getStorage(_getFileName(), blob,
      function onStorage(error, storage, filename) {
        if (checkError(error)) {
          return;
        }

        if (cancelled) {
          finishCallback(null, 0, false);
          return;
        }

        _saveToSdcard(storage, filename, blob,
        function onVcardSaved(error, filepath) {
          if (checkError(error)) {
            return;
          }

          _getFile(storage, filepath, function onFileRetrieved(error, file) {
            if (checkError(error)) {
              return;
            }

            var a = new MozActivity({
              name: 'share-via-bluetooth-only',
              data: {
                type: 'text/vcard',
                number: 1,
                blobs: [file],
                filenames: [filename],
                filepaths: [filepath]
              }
            });

            a.onsuccess = function() {
              finishCallback(null, contacts.length);
            };

            a.onerror = function(e) {
              if (a.error.name === 'NO_PROVIDER') {
                alert(_('share-noprovider'));
              } else {
                console.warn('share activity error:', a.error.name);
              }
              finishCallback({'reason': a.error}, 0, a.error.name);
            };
          });
        });
      });
    });
  };

  return {
    'setContactsToExport': _setContactsToExport,
    'shouldShowProgress': function btex_shouldShowProgress() { return true; },
    'hasDeterminativeProgress': _hasDeterminativeProgress,
    'getExportTitle': _getExportTitle,
    'setProgressStep': _setProgressStep,
    'doExport': _doExport,
    'cancelExport' : cancelExport,
    get name() { return 'BT';} // handling error messages on contacts_exporter
  };
};
