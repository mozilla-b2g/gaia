/* global ConfirmDialog */
/* global Loader */
/* global fbLoader */
/* global IccHandler */
/* global LazyLoader */
/* global Overlay */
/* global Rest */
/* global SimContactsImporter */
/* global utils */
/* global VCFReader */
/* global ContactsService */
/* global ExtServices */
/* global SettingsUI */
/* global Telemetry */

(function(exports) {
  'use strict';

  var PENDING_LOGOUT_KEY = 'pendingLogout';

  var _activity = null;
  var _changedContacts = [];

  // Initialise the settings controller events
  function init() {

    // TODO rename (includes outlook and gmail too) and delete FB part
    fbLoader.load();


    /*
     * Currently import/export are working within an <iframe>, which
     * is not high-performance (we could do the same with window.open)
     * and furthermore is changing the history of our Contacts App
     * adding steps that we dont need.
     * This must be addressed in:
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1183561
     * In the meanwhile we will workaround this with
     * sessionStorage + window.history.
     */
    window.addEventListener('close-ui', function() {
      window.history.go(-(window.history.length-1));
    });

    window.addEventListener('delete-ui', function() {
      sessionStorage.setItem('action', 'delete');
      window.history.go(-(window.history.length-1));
    });

    ContactsService.addListener('contactchange',
      function oncontactchange(event) {
        var eventsStringified = sessionStorage.getItem('contactChanges');
        var events = [];
        if (eventsStringified && eventsStringified !== 'null') {
          events = JSON.parse(eventsStringified);
        }
        events.push({
          contactID: event.contactID,
          reason: event.reason
        });
        sessionStorage.setItem('contactChanges', JSON.stringify(events));
    });

    // Given an event, select which element should be targeted
    function getSource(dataset) {
      var source = dataset.source;
      // Check special cases
      if (source && source.indexOf('-') != -1) {
        source = source.substr(0, source.indexOf('-'));
      }
      return source;
    }

    function handleImport(event) {
      /* jshint validthis:true */
      var dataset = event.detail.target.parentNode.dataset;
      var source = getSource(dataset);
      switch (source) {
        case 'sim':
          var iccId = dataset.iccid;
          window.setTimeout(
            requireSimImport.bind(this, onSimImport.bind(this, iccId)), 0);
          break;
        case 'sd':
          window.setTimeout(requireOverlay.bind(this, onSdImport), 0);
          break;
        case 'gmail':
          ExtServices.onContactsImported = logImportUsage.bind(null, 'gmail');
          ExtServices.importGmail();
          break;
        case 'live':
          ExtServices.onContactsImported = logImportUsage.bind(null, 'live');
          ExtServices.importLive();
          break;
      }
    }
    window.addEventListener('importClicked', handleImport);

    function handleExport(event){
      var dataset = event.detail.target.parentNode.dataset;
      var source = getSource(dataset);
      sessionStorage.setItem('action', 'export');
      sessionStorage.setItem('destination', source);
      if (source === 'sim') {
        sessionStorage.setItem('iccId', dataset.iccid);
      };

      window.history.go(-(window.history.length-1));
    }
    window.addEventListener('exportClicked', handleExport);
  }

  function logImportUsage(name) {
    return Telemetry.logImportUsage(name);
  }

  function checkNoContacts() {
    return new Promise((resolve, reject) => {
      ContactsService.isEmpty(function(error, isEmpty) {
        if (error) {
          reject(error);
        } else {
          resolve(isEmpty);
        }
      });
    });
  }

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Loader.utility('Overlay', callback);
  }

  function saveStatus(data) {
    window.asyncStorage.setItem(PENDING_LOGOUT_KEY, data);
  }

  function automaticLogout() {
    if (navigator.offLine === true) {
      return;
    }

    LazyLoader.load(['/shared/js/contacts/utilities/http_rest.js'],
    function() {
      window.asyncStorage.getItem(PENDING_LOGOUT_KEY, function(data) {
        if (!data) {
          return;
        }
        var services = Object.keys(data);
        var numResponses = 0;

        services.forEach(function(service) {
          var url = data[service];

          var callbacks = {
            success: function logout_success() {
              numResponses++;
              delete data[service];
              if (numResponses === services.length) {
                saveStatus(data);
              }
            },
            error: function logout_error() {
              numResponses++;
              if (numResponses === services.length) {
                saveStatus(data);
              }
            },
            timeout: function logout_timeout() {
              numResponses++;
              if (numResponses === services.length) {
                saveStatus(data);
              }
            }
          };
          Rest.get(url, callbacks);
        });
      });
    });
  }

  /**
   * Loads required libraries for sim import
   */
  function requireSimImport(callback) {
    var libraries = ['Import_sim_contacts'];
    var pending = libraries.length;

    libraries.forEach(function onPending(library) {
      Loader.utility(library, next);
    });

    function next() {
      if (!(--pending)) {
        callback();
      }
    }
  }

  // Import contacts from SIM card and updates ui
  function onSimImport(iccId, done) {
    var icc = IccHandler.getIccById(iccId);
    if (icc === null) {
      return;
    }
    Overlay.showActivityBar('simContacts-reading', true);

    var wakeLock = navigator.requestWakeLock('cpu');

    var cancelled = false,
        contactsRead = false;

    var importer = new SimContactsImporter(icc);

    Overlay.oncancel = function() {
      cancelled = true;
      importer.finish();
      if (contactsRead) {
        // A message about canceling will be displayed while the current chunk
        // is being cooked
       Overlay.showActivityBar('messageCanceling', true);
      } else {
        importer.onfinish(); // Early return while reading contacts
      }
    };
    var totalContactsToImport;
    var importedContacts = 0;
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;

    importer.onread = function(n) {
      contactsRead = true;
      totalContactsToImport = n;
      if (totalContactsToImport > 0) {
        Overlay.showProgressBar('simContacts-importing', totalContactsToImport);
      }
    };

    importer.onfinish = function(numDupsMerged) {
      window.setTimeout(function onfinish_import() {
        resetWait(wakeLock);

        if (!cancelled) {
          utils.status.show({
            id: 'simContacts-imported3',
            args: {
              n: importedContacts
            }
          },
          // no merged contacts = no extra message
          !numDupsMerged ? null : {
            id: 'contactsMerged',
            args: {
              numDups: numDupsMerged
            }
          });
        } else {
          logImportUsage('sim');
        }

        var source = 'sim-' + iccId;
        utils.misc.setTimestamp(source, function() {
          // Once the timestamp is saved, update the list
          window.dispatchEvent(new CustomEvent('contactsimportdone'));
        });

        typeof done === 'function' && done();

      }, DELAY_FEEDBACK);

      importer.onfinish = null;
    };

    importer.onimported = function() {
      importedContacts++;
      if (!cancelled) {
        Overlay.updateProgressBar();
      }
    };

    importer.onerror = function() {
      var cancel = {
        title: 'cancel',
        callback: function() {
          ConfirmDialog.hide();
        }
      };
      var retry = {
        title: 'retry',
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          window.setTimeout(requireSimImport.bind(this,
            onSimImport.bind(this, iccId)), 0);
        }
      };
      ConfirmDialog.show(null, 'simContacts-error', cancel, retry);
      window.dispatchEvent(new CustomEvent('contactsimportdone'));
      resetWait(wakeLock);
    };

    importer.start();
  }

  function onSdImport(cb) {
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;
    var importedContacts = 0;
    var cancelled = false;
    var importer = null;

    var wakeLock = navigator.requestWakeLock('cpu');

    Overlay.showActivityBar('memoryCardContacts-importing',
                            false /* no menu */,
                            'infiniteProgress');
    Overlay.oncancel = function() {
      cancelled = true;
      importer ? importer.finish() : Overlay.hide();
    };

    utils.sdcard.retrieveFiles([
      'text/vcard',
      'text/x-vcard',
      'text/directory;profile=vCard',
      'text/directory'
    ], ['vcf', 'vcard'], function(err, fileArray) {
      if (err) {
        import_error(err, cb);
        window.dispatchEvent(new CustomEvent('contactsimportdone'));
        return;
      }

      if (cancelled) {
        window.dispatchEvent(new CustomEvent('contactsimportdone'));
        return;
      }

      if (fileArray.length) {
        var promises = [];
        fileArray.forEach(file => {
          promises.push(utils.sdcard.getTextFromFile(file, onContacts));
        });
        Promise.all(promises).then(results => {
          var numDupsMerged = results.reduce((sum, current) => {
            return sum + current;
          });
          window.setTimeout(() => {
            utils.misc.setTimestamp('sd', () => {
              if (!cancelled) {
                var msg1 = {
                  id: 'memoryCardContacts-imported3',
                  args: {
                    n: importedContacts
                  }
                };
                var msg2 = !numDupsMerged ? null : {
                  id: 'contactsMerged',
                  args: {
                    numDups: numDupsMerged
                  }
                };
                utils.status.show(msg1, msg2);

                logImportUsage('sd');

                if (typeof cb === 'function') {
                  cb();
                }
              }

              // Once the timestamp is saved, update the list
              window.dispatchEvent(new CustomEvent('contactsimportdone'));
              if (_changedContacts) {
                sessionStorage.setItem('contactChanges',
                                       JSON.stringify(_changedContacts));
              }

              resetWait(wakeLock);
            });
          }, DELAY_FEEDBACK);
        }).catch(error => {
          window.dispatchEvent(new CustomEvent('contactsimportdone'));
          import_error(error);
        });
      } else {
        window.dispatchEvent(new CustomEvent('contactsimportdone'));
        import_error('No contacts were found.', cb);
      }
    });

    function onContacts(text) {
      if (cancelled) {
        return Promise.reject();
      }
      return new Promise((resolve, reject) => {
        importer = new VCFReader(text);
        if (!text || !importer) {
          var error = 'No contacts were found';
          import_error(error);
          reject(error);
          return;
        }

        importer.onimported = imported_contact;
        importer.onerror = error => {
          import_error(error);
          reject(error);
        };

        importer.process((unused, numDupsMerged) => {
          if (cancelled) {
            reject('Cancelled');
            Overlay.hide();
            return;
          }
          resolve(numDupsMerged);
        });
      });
    }

    function imported_contact(contact) {
      importedContacts++;

      var contactEvent = {
        contactID: contact.id,
        reason: 'update'
      };
      _changedContacts.unshift(contactEvent);

      Overlay.updateProgressBar();
    }

    function import_error(e, cb) {
      var cancel = {
        title: 'cancel',
        callback: function() {
          ConfirmDialog.hide();
        }
      };

      var retry = {
        title: 'retry',
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          window.setTimeout(requireOverlay.bind(this, onSdImport), 0);
        }
      };
      ConfirmDialog.show(null, 'memoryCardContacts-error', cancel, retry);
      resetWait(wakeLock);
      if (typeof cb === 'function') {
        cb();
      }
    }
  }

  function resetWait(wakeLock) {
    Overlay.hide();
    if (wakeLock) {
      wakeLock.unlock();
    }
  }

  exports.SettingsController = {
    'init': init,
    'checkNoContacts': checkNoContacts,
    'automaticLogout': automaticLogout,
    get activity() {
      return _activity;
    },
    set activity(value) {
      _activity = value;
    }
  };

})(window);
