'use strict';

//
//  Generic module to do contacts export.
//
//  Once passed to this module an array of mozContacts objects
//  and setup the strategy (mechanism to export), will perform
//  the common steps taken place during the process of exporting
//  the information.

//  Those steps are:

//  - Preparation: (optional), may launch extra UI to setup some configuration
//    and transform the mozcontacts object to any extra format
//  - Export: Here is where the real import happens, could provide three known
//    scenarios:
//      - External handling of the export (web activity, ect.)
//      - Progress of the import:
//        - Defined progress activity
//        - Undefined progress
//  - Result of the export

window.ContactsExporter = function ContactsExporter(theStrategy) {

  var contacts;
  var strategy = theStrategy;
  var hasProgress = false;
  var determinativeProgress = false;
  var progress;

  // XXX: Bug 904623 since we cannot fetch a list of contacts by
  // contact id, we will need to fetch them all and filter
  var init = function init(theContacts, cb) {
    if (theContacts == null || theContacts.length == 0) {
      return;
    }

    var request = navigator.mozContacts.find({});
    request.onsuccess = function onSuccess() {
      contacts = [];
      request.result.forEach(function onContact(ct) {
        if (theContacts.indexOf(ct.id) !== -1) {
          contacts.push(ct);
        }
      });
      if (cb) {
        cb(contacts);
      }
    };
    request.onerror = function onError() {
      if (cb) {
        cb();
      }
    };
  };

  //
  // Checks if the export module has been properly configured
  // and start the process of exporting.
  //
  var start = function start() {
    if (!contacts || !strategy) {
      throw new Error('Not properly configured');
    }

    strategy.setContactsToExport(contacts);

    // Check if we have a 'Preparation step'
    if (typeof strategy.prepare === 'function') {
      strategy.prepare(doExport);
    } else {
      doExport();
    }
  };

  var doExport = function doExport() {
    if (typeof strategy.shouldShowProgress === 'function' &&
        strategy.shouldShowProgress()) {
      hasProgress = true;
      configureProgress();
      displayProgress();
    }

    strategy.doExport(doHandleResult);
  };

  //
  // Callback invoked when the exporting process finished.

  // @param: {Object} error Not null in case an error happened
  // @param: {Integer} exported Number of contacts successfuly exported
  // @param: {String} message Any extra message from the exporting mechanism
  //
  var doHandleResult = function doHandleResult(error, exported, message) {
    if (hasProgress) {
      utils.overlay.hide();
    }
    // TODO: show error if any
    if (error) {
      console.error('An error occurred during the export: ' + error.reason);
    }
    // TODO: Better mechanism to show result
    var msg = exported + ' out of ' + contacts.length + ' exported';
    utils.status.show(msg);
  };

  //
  // Based on the strategy configure the progress display to show a
  // determinative or indeterminate ui depending on the strategy
  //
  var configureProgress = function configureProgress() {
    determinativeProgress =
      strategy['hasDeterminativeProgress'] !== undefined &&
      strategy.hasDeterminativeProgress();
  };

  //
  // Shows the progress dialog based on the
  //
  var displayProgress = function displayProgress() {
    var progressClass = determinativeProgress ? 'progressBar' : 'spinner';

    Contacts.utility('Overlay', function _loaded() {
      progress = utils.overlay.show(
        strategy.getExportTitle(),
        progressClass,
        null
      );

      // Allow the strategy to setup the progress bar
      if (determinativeProgress) {
        progress.setTotal(contacts.length);
        strategy.setProgressStep(progress.update);
      }
    });
  };

  return {
    'init': init,
    'start': start
  };

};
