var ContactsSIMExport = function ContactsSIMExport(icc) {

  var contacts;
  var progressStep;
  var exported = [];
  var notExported = [];

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
    // We should control this state before doing the export
    // but a second check is healthy
    if (!icc) {
      finishCallback({
        'reason': 'unavailable'
      }, 0, 'No SIM detected');
      return;
    }
    // Cover the whole process under a try/catch to
    // prevent inconsistent states caused by unexpected
    // errors and return back the control to the
    // generic exporter
    try {
      _doExport(0, finishCallback);
    } catch (e) {
      finishCallback({
        'reason': e.name
      }, exported.length, e.message);
    }
  };

  // Returns the iccContactId to be used for exporting this contact
  // undefined if not iccContactId is found
  // url content is urn:uuid:<iccid>-icccontactid
  var _getIccContactId = function _getIccContactId(theContact) {
    var out;

    var contactUrl = theContact.url;
    if (Array.isArray(contactUrl)) {
      for (var j = 0; j < contactUrl.length; j++) {
        var aUrl = contactUrl[j];
        if (aUrl.type.indexOf('source') !== -1 &&
                                          aUrl.type.indexOf('sim') !== -1) {
          var value = aUrl.value.split(':')[2];
          var iccInfo = value.split('-');
          if (iccInfo[0] === icc.iccInfo.iccid) {
            out = iccInfo[1];
            break;
          }
        }
      }
    }
    return out;
  };

  var _doExport = function _doExport(step, finishCallback) {
    if (step == contacts.length) {
      finishCallback(null, exported.length, null);
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
    var idToUpdate = _getIccContactId(theContact);
    if (!idToUpdate) {
      delete theContact.id;
    }
    else {
      theContact.id = idToUpdate;
    }

    var request = icc.updateContact('adn', theContact);
    request.onsuccess = function onsuccess() {
      next(true, theContact);
    };
    request.onerror = function onerror(e) {
      // Don't send an error, just continue
      next(false, theContact);
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
