var ContactsSIMExport = function ContactsSIMExport() {

  var contacts;
  var progressStep;
  var icc = navigator.mozIccManager || (navigator.mozMobileConnection &&
            navigator.mozMobileConnection.icc);
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
