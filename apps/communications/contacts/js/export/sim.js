'use strict';

var ContactsSIMExport = function ContactsSIMExport(icc) {

  var contacts;
  var progressStep;
  var exported;
  var notExported;

  var ERRORS = {
    'NoFreeRecordFound': false,
    'CannotAccessPhoneBook': true
  };

  var setContactsToExport = function setContactsToExport(cts) {
    contacts = cts;
  };

  var hasDeterminativeProgress = function hasDeterminativeProgress() {
    return contacts.length > 1;
  };

  var setProgressStep = function setProgressStep(p) {
    progressStep = p;
  };

  var getExportTitle = function getExportTitle() {
    return _('simExport-title');
  };

  var doExport = function doExport(finishCallback) {
    if (typeof finishCallback !== 'function') {
      throw new Error('SIM export requires a callback function');
    }

    exported = [];
    notExported = [];

    // We should control this state before doing the export
    // but a second check is healthy
    if (!icc) {
      finishCallback({
        'reason': 'Unavailable'
      }, 0, false);
      return;
    }

    _doExport(0, finishCallback);
  };

  // Returns the iccContactId to be used for exporting this contact
  // undefined if not iccContactId is found
  // url content is urn:uuid:<iccid>-icccontactid
  var _getIccContactId = function _getIccContactId(theContact) {
    var out;
    var contactUrl = theContact.url;
    if (!Array.isArray(contactUrl)) {
      return out;
    }

    for (var j = 0; j < contactUrl.length; j++) {
      var aUrl = contactUrl[j];
      if (aUrl.type.indexOf('source') !== -1 &&
                                        aUrl.type.indexOf('sim') !== -1) {
        var value = aUrl.value.split(':')[2];
        var iccInfo = value.split('-');
        if (iccInfo[0] === _getIccId()) {
          out = iccInfo[1];
          break;
        }
      }
    }
    return out;
  };

  var _generateIccContactUrl = function _generateIccContactUrl(contactid,
                                                               iccId) {
    var urlValue = 'urn:' + 'uuid:' + (iccId || 'iccId') + '-' + contactid;
    return {
      type: ['source', 'sim'],
      value: urlValue
    };
  };

  var _getIccId = function _getIccId() {
    return icc.iccInfo && icc.iccInfo.iccid;
  };

  var _updateContactSimSource = function _updateContactSimSource(theContact,
                                                      iccContact, cb, errorCb) {
    if (!iccContact) {
      window.console.warn('No Icc Contact provided');
      cb();
      return;
    }

    theContact.url = theContact.url || [];
    theContact.url.push(_generateIccContactUrl(iccContact.id, _getIccId()));
    var req = navigator.mozContacts.save(theContact);
    req.onsuccess = cb;
    req.onerror = function() {
      errorCb(req.error);
    };
  };

  var _doExport = function _doExport(step, finishCallback) {
    if (step == contacts.length) {
      finishCallback(null, exported.length);
      return;
    }

    var next = function next(success, contact) {
      var resultArray = success ? exported : notExported;
      resultArray.push(contact);
      if (progressStep) {
        progressStep();
      }
      step++;
      _doExport(step, finishCallback);
    };

    var theContact = contacts[step];
    var originalContactId = theContact.id;
    var idToUpdate = _getIccContactId(theContact);
    if (!idToUpdate) {
      theContact.id = null;
    }
    else {
      theContact.id = idToUpdate;
    }

    var request = icc.updateContact('adn', theContact);
    request.onsuccess = function onsuccess() {
      // Restoring the original contact.id to avoid duplicating it
      theContact.id = originalContactId;

      if (idToUpdate) {
        next(true, theContact);
        return;
      }
      // Now it is needed to save the provided id in case we don't have one
      var iccContact = request.result;
      _updateContactSimSource(theContact, iccContact,
                              function export_update_success() {
        next(true, theContact);
      }, function export_update_error(err) {
          window.console.error('Error while updating: ', err.name);
          next(true, theContact);
      });
    };

    request.onerror = function onerror(e) {
      var error = e.target.error;
      window.console.error('Error while exporting: ', originalContactId,
                           error.name);

      var errorName = typeof ERRORS[error.name] === 'boolean' ?
                                                  error.name : 'GenericError';

      if (errorName !== 'GenericError') {
        finishCallback({
          'reason': errorName
        }, exported.length, ERRORS[error.name]);
      }
      else {
        next(false, theContact);
      }
    };
  };

  return {
    'setContactsToExport': setContactsToExport,
    'shouldShowProgress': function() { return true },
    'hasDeterminativeProgress': hasDeterminativeProgress,
    'getExportTitle': getExportTitle,
    'doExport': doExport,
    'setProgressStep': setProgressStep,
    get name() { return 'SIM';} // handling error messages on contacts_exporter
  };

};
