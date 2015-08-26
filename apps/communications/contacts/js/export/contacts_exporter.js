/* global utils, ConfirmDialog, Contacts, ContactsService, Loader */
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
  var _init = function _init(theContacts, cb) {
    if (theContacts === null || theContacts.length === 0) {
      return;
    }

    ContactsService.getAll(function(e, contactsFromAPI) {
      if (e) {
        cb();
        return;
      }
      contacts = [];
      contactsFromAPI.forEach(function onContact(ct) {
        if (theContacts.indexOf(ct.id) !== -1) {
          contacts.push(ct);
        }
      });
      if (cb) {
        cb(contacts);
      }
    });
  };

  //
  // Checks if the export module has been properly configured
  // and start the process of exporting.
  //
  var _start = function _start() {
    if (!contacts || !strategy) {
      throw new Error('Not properly configured');
    }

    strategy.setContactsToExport(contacts);

    // Check if we have a 'Preparation step'
    if (typeof strategy.prepare === 'function') {
      strategy.prepare(_doExport);
    } else {
      _doExport();
    }
  };

  var _doExport = function _doExport() {
    if (typeof strategy.shouldShowProgress === 'function' &&
        strategy.shouldShowProgress()) {
      hasProgress = true;
      _configureProgress();
      _displayProgress();
    }

    strategy.doExport(_doHandleResult);
  };

  /**
   * Callback invoked when the exporting process finished.
   *
   * @param {Object} error Not null in case an error happened
   * @param {Number} exported Number of contacts successfuly exported
   * @param {Boolean} isRecoverable In case of error, whether it is recoverable
   */
  var _doHandleResult = function _doHandleResult(error, exported,
                                                 isRecoverable) {
    if (hasProgress && !error) {
      utils.overlay.hide();
    }

    if (error) {
      // If it was cancelled by the user we don't show the error screen.
      if (error.reason && error.reason.name === 'cancelled') {
        utils.overlay.hide();
      } else {
        var cancel = {
          title: 'cancel',
          callback: function() {
            utils.overlay.hide();
            ConfirmDialog.hide();
            _showStatus(exported, contacts.length);
          }
        };

        var retry = {
          title: 'retry',
          isRecommend: true,
          callback: function() {
            utils.overlay.hide();
            ConfirmDialog.hide();
            // And now the action is reproduced one more time
            window.setTimeout(_doExport, 0);
          }
        };

        if (isRecoverable === false) {
          retry = null;
        }

        var errorString = 'exportError-' + strategy.name + '-';
        ConfirmDialog.show('exportErrorTitle',
                              errorString + error.reason, cancel, retry);

        Contacts.hideOverlay();

        console.error('An error occurred during the export: ',
                      error.reason.name || error.reason);
        return;
      }
    }

    _showStatus(exported, contacts.length);
  };

  var _showStatus = function(exported, total) {
    // TODO: Better mechanism to show result
    var msgId = {
      id: 'contactsExported2',
      args: {
        'exported': exported,
        'total': total
      }
    };

    utils.status.show(msgId);
  };

  //
  // Based on the strategy configure the progress display to show a
  // determinative or indeterminate ui depending on the strategy
  //
  var _configureProgress = function _configureProgress() {
    determinativeProgress =
      strategy.hasDeterminativeProgress !== undefined &&
      strategy.hasDeterminativeProgress();
  };

  //
  // Shows the progress dialog based on the
  //
  var _displayProgress = function _displayProgress() {
    var progressClass = determinativeProgress ? 'progressBar' : 'spinner';

    Loader.utility('Overlay', function _loaded() {
      progress = utils.overlay.show(
        strategy.getExportTitle(),
        progressClass,
        null
      );
      utils.overlay.showMenu();
      utils.overlay.oncancel = function() {
        strategy.cancelExport();
        utils.overlay.hide();
      };

      // Allow the strategy to setup the progress bar
      if (determinativeProgress) {
        progress.setTotal(contacts.length);
        strategy.setProgressStep(progress.update);
      }
    });
  };

  return {
    'init': _init,
    'start': _start
  };

};
