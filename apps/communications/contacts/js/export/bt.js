'use strict';

var ContactsBTExport = function ContactsBTExport() {
  var contacts;
  var progressStep;
  var exported = [];
  var notExported = [];
  var _ = navigator.mozL10n.get;

  var _setContactsToExport = function btex_setContactsToExport(cts) {
    contacts = cts;
  };

  var _hasDeterminativeProgress = function btex_hasDeterminativeProgress() {
    return false;
  };

  var _getExportTitle = function btex_getExportTitle() {
    return _('btExport-title');
  };

  var _setProgressStep = function btex_setProgressStep(p) {
    progressStep = p;
  };

  var _hasName = function _hasName(contact) {
    return (Array.isArray(contact.givenName) && contact.givenName[0] &&
              contact.givenName[0].trim()) ||
            (Array.isArray(contact.familyName) && contact.familyName[0] &&
              contact.familyName[0].trim());
  };
  var _getFileName = function _getFileName() {
    var filename = [];
    if (contacts && contacts.length === 1) {
      var contact = contacts[0];
      if (_hasName(contact)) {
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

  var _doExport = function btex_doExport(finishCallback) {
    if (typeof finishCallback !== 'function') {
      throw new Error('BT export requires a callback function');
    }

    var checkError = function checkError(error) {
      if (!error) {
        return false;
      }
      var reason = error;
      // numeric error means not enough space available
      if (parseInt(error, 10) > 0) {
        reason = 'noSpace';
      }
      finishCallback({
        'reason': reason
      }, 0, error.message);
      return true;
    };

    ContactToVcardBlob(contacts, function onContacts(blob) {
      _getStorage(_getFileName(), blob,
      function onStorage(error, storage, filename) {
        if (checkError(error))
          return;

        _saveToSdcard(storage, filename, blob,
        function onVcardSaved(error, filepath) {
          if (checkError(error))
            return;

          _getFile(storage, filepath,
          function onFileRetrieved(error, file) {
            if (checkError(error))
              return;

            var a = new MozActivity({
              name: 'share',
              data: {
                type: 'text/vcard',
                number: 1,
                blobs: [file],
                filenames: [filename],
                filepaths: [filepath]
              }
            });
            a.onsuccess = function() { // Everything went OK
              finishCallback(null, contacts.length, null); // final callback
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
    'shouldShowProgress': function btex_shouldShowProgress() { return true },
    'hasDeterminativeProgress': _hasDeterminativeProgress,
    'getExportTitle': _getExportTitle,
    'setProgressStep': _setProgressStep,
    'doExport': _doExport,
    get name() { return 'BT';} // handling error messages on contacts_exporter
  };
};
