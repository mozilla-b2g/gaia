'use strict';
/* global _ */
/* global Cache */
/* global ConfirmDialog */
/* global Contacts */
/* global ContactsBTExport */
/* global ContactsExporter */
/* global ContactsSDExport */
/* global ContactsSIMExport */
/* global IccHandler */
/* global LazyLoader */
/* global navigationStack */
/* global Rest */
/* global SimContactsImporter */
/* global SimDomGenerator */
/* global utils */
/* global VCFReader */
/* global ContactsService */
/* global ExtServices */
/* global Loader */
/* global BulkDelete */

var contacts = window.contacts || {};

/***
 This class handles all the activity regarding
 the settings screen for contacts
 **/
contacts.Settings = (function() {

  var navigationHandler,
    importSettingsHeader,
    orderCheckBox,
    orderItem,
    orderByLastName,
    setICEButton,
    importSettingsPanel,
    importSettingsTitle,
    importContacts,
    exportContacts,
    importOptions,
    exportOptions,
    importLiveOption,
    importGmailOption,
    importSDOption,
    exportSDOption,
    newOrderByLastName = null,
    PENDING_LOGOUT_KEY = 'pendingLogout',
    bulkDeleteButton;

    var EXPORT_TRANSITION_LEVEL = 2, DELETE_TRANSITION_LEVEL = 1;

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    // Create the DOM for our SIM cards and listen to any changes
    IccHandler.init(new SimDomGenerator(), contacts.Settings.cardStateChanged);

    initContainers();
    // To avoid any race condition we listen for online events once
    // containers have been initialized
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    // Subscribe to events related to change state in the sd card
    utils.sdcard.subscribeToChanges('check_sdcard', function(value) {
      updateStorageOptions(utils.sdcard.checkStorageCard());
    });

    window.addEventListener('timeformatchange', updateTimestamps);
  };

  var hideSettings = function hideSettings() {
    contacts.Settings.close();
  };

  // Get the different values that we will show in the app
  var getData = function getData() {
    var config = utils.cookie.load();
    var order = config ? config.order : false;
    orderByLastName = order;
    newOrderByLastName = null;
    updateOrderingUI();
  };

  var updateOrderingUI = function updateOrderingUI() {
    var value = newOrderByLastName === null ? orderByLastName :
      newOrderByLastName;
    orderCheckBox.checked = value;
    orderCheckBox.setAttribute('aria-checked', value);
  };

  var updateImportTitle = function updateImportTitle(l10nString) {
    importSettingsTitle.setAttribute('data-l10n-id', l10nString);
  };

  // Initialises variables and listener for the UI
  var initContainers = function initContainers() {
    orderItem = document.getElementById('settingsOrder');
    orderCheckBox = orderItem.querySelector('[name="order.lastname"]');
    orderCheckBox.addEventListener('change', onOrderingChange.bind(this));
    // Creating a navigation handler from this view
    navigationHandler = new navigationStack('view-settings');

    // Init panel & elements for caching them
    importSettingsPanel = document.getElementById('import-settings');
    importSDOption = document.getElementById('import-sd-option');
    exportSDOption = document.getElementById('export-sd-option');
    importSettingsTitle = document.getElementById('import-settings-title');
    importLiveOption = document.getElementById('import-live-option');
    importGmailOption = document.getElementById('import-gmail-option');

    // ICE view
    setICEButton = document.getElementById('set-ice');

    /*
     * Adding listeners
     */

    document.getElementById('settings-close').addEventListener(
      'click',
      hideSettings
    );
    // Listener for updating the timestamp based on extServices
    window.addEventListener('message', function updateList(e) {
      if (e.data.type === 'import_updated') {
        updateTimestamps();
        checkNoContacts();
      }
    });

    // Navigation back
    importSettingsHeader = document.getElementById('import-settings-header');
    importSettingsHeader.addEventListener('action', importSettingsBackHandler);

    // Handlers for the navigation through the panels
    importContacts = document.getElementById('importContacts');
    importContacts.firstElementChild.
      addEventListener('click', importContactsHandler);

    exportContacts = document.getElementById('exportContacts');
    exportContacts.firstElementChild.
      addEventListener('click', exportContactsHandler);

    // Handlers for the actions related with EXPORT/IMPORT
    importOptions = document.getElementById('import-options');
    importOptions.addEventListener('click', importOptionsHandler);

    exportOptions = document.getElementById('export-options');
    exportOptions.addEventListener('click', exportOptionsHandler);

    // ICE view
    setICEButton.addEventListener('click', showICEScreen);

    // Bulk delete
    bulkDeleteButton = document.getElementById('bulkDelete');
    bulkDeleteButton.addEventListener('click', bulkDeleteHandler);
  };

  // UI event handlers
  function importSettingsBackHandler() {
    navigationHandler.back(function navigateBackHandler() {
        // Removing the previous assigned style for having
        // a clean view
        importSettingsPanel.classList.remove('export');
        importSettingsPanel.classList.remove('import');
    });
  }

  function importContactsHandler() {
      // Hide elements for export and transition
      importSettingsPanel.classList.remove('export');
      importSettingsPanel.classList.add('import');
      updateImportTitle('importContactsTitle');
      navigationHandler.go('import-settings', 'right-left');
  }

  function exportContactsHandler() {
      // Hide elements for import and transition
      LazyLoader.load(['/contacts/js/export/contacts_exporter.js'], loadSearch);

      function loadSearch() {
        Loader.view('search', function() {
          importSettingsPanel.classList.remove('import');
          importSettingsPanel.classList.add('export');
          updateImportTitle('exportContactsTitle');
          navigationHandler.go('import-settings', 'right-left');
        });
      }
  }

  function showICEScreen(cb) {
    LazyLoader.load([
      '/contacts/js/utilities/ice_data.js',
      '/contacts/js/views/ice_settings.js',
      '/shared/js/contacts/utilities/ice_store.js'], function(){
      contacts.ICE.refresh();
      navigationHandler.go('ice-settings', 'right-left');
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  // Given an event, select wich should be the targeted
  // import/export source
  function getSource(e) {
    var source = e.target.parentNode.dataset.source;
    // Check special cases
    if (source && source.indexOf('-') != -1) {
      source = source.substr(0, source.indexOf('-'));
    }
    return source;
  }

  function importOptionsHandler(e) {
    /* jshint validthis:true */

    var source = getSource(e);
    switch (source) {
      case 'sim':
        var iccId = e.target.parentNode.dataset.iccid;
        window.setTimeout(requireSimImport.bind(this,
          onSimImport.bind(this, iccId)), 0);
        break;
      case 'sd':
        window.setTimeout(requireOverlay.bind(this, onSdImport), 0);
        break;
      case 'gmail':
        ExtServices.importGmail();
        break;
      case 'live':
        ExtServices.importLive();
        break;
    }
  }

  var bulkDeleteHandler = function bulkDeleteHandler() {
    LazyLoader.load(
      [
        '/contacts/js/contacts_bulk_delete.js',
        '/contacts/js/contacts_remover.js'
      ],
      function() {
        Loader.view('search', function() {
          contacts.List.selectFromList(_('DeleteTitle'),
            function onSelectedContacts(promise, done) {
              BulkDelete.performDelete(promise, done);
            },
            null,
            navigationHandler,
            {
              transitionLevel: DELETE_TRANSITION_LEVEL
            }
          );
        });
      }
    );
  };

  function exportOptionsHandler(e) {
    var source = getSource(e);
    switch (source) {
      case 'sim':
        var iccId = e.target.parentNode.dataset.iccid;
        LazyLoader.load(['/contacts/js/export/sim.js'],
          function() {
            doExport(new ContactsSIMExport(IccHandler.getIccById(iccId)));
          }
        );
        break;
      case 'sd':
        LazyLoader.load(
          [
            '/shared/js/device_storage/get_storage_if_available.js',
            '/shared/js/device_storage/get_unused_filename.js',
            '/shared/js/contact2vcard.js',
            '/shared/js/setImmediate.js',
            '/contacts/js/export/sd.js'
          ],
          function() {
            doExport(new ContactsSDExport());
          }
        );
        break;
      case 'bluetooth':
        LazyLoader.load(
          [
            '/shared/js/device_storage/get_storage_if_available.js',
            '/shared/js/device_storage/get_unused_filename.js',
            '/shared/js/contact2vcard.js',
            '/shared/js/setImmediate.js',
            '/contacts/js/export/bt.js'
          ],
          function() {
            doExport(new ContactsBTExport());
          }
        );
        break;
    }
  }

  function doExport(strategy) {
    // Launch the selection mode in the list, and then invoke
    // the export with the selected strategy.

    contacts.List.selectFromList(_('exportContactsAction'),
      function onSelectedContacts(promise) {
        // Resolve the promise, meanwhile show an overlay to
        // warn the user of the ongoin operation, dismiss it
        // once we have the result
        requireOverlay(function _loaded() {
          utils.overlay.show('preparing-contacts', null, 'spinner');
          promise.onsuccess = function onSuccess(ids) {
            // Once we start the export process we can exit from select mode
            // This will have to evolve once export errors can be captured
            contacts.List.exitSelectMode();
            var exporter = new ContactsExporter(strategy);
            exporter.init(ids, function onExporterReady() {
              // Leave the contact exporter to deal with the overlay
              exporter.start();
            });
          };
          promise.onerror = function onError() {
            contacts.List.exitSelectMode();
            utils.overlay.hide();
          };
        });
      },
      null,
      navigationHandler,
      {
        isDanger: false,
        transitionLevel: EXPORT_TRANSITION_LEVEL
      }
    );
  }

  // Options checking & updating

  var checkSIMCard = function checkSIMCard() {
    var statuses = IccHandler.getStatus();
    statuses.forEach(function onStatus(status) {
      enableSIMOptions(status.iccId, status.cardState);
    });
  };

  // Disables/Enables an option and show the error if needed
  var updateOptionStatus =
    function updateOptionStatus(domOption, disabled, error) {
    if (domOption === null) {
      return;
    }
    var optionButton = domOption.firstElementChild;
    if (disabled) {
      optionButton.setAttribute('disabled', 'disabled');
      if (error) {
        domOption.classList.add('error');
      } else {
        domOption.classList.remove('error');
      }
    } else {
      optionButton.removeAttribute('disabled');
      domOption.classList.remove('error');
    }
  };

  // Disables/Enables the actions over the sim import functionality
  var enableSIMOptions = function enableSIMOptions(iccId, cardState) {
    var importSimOption = document.getElementById('import-sim-option-' + iccId);
    var exportSimOption = document.getElementById('export-sim-option-' + iccId);
    var disabled = (cardState !== 'ready' && cardState !== 'illegal');
    updateOptionStatus(importSimOption, disabled, true);
    updateOptionStatus(exportSimOption, disabled, true);
  };

  /**
   * Disables/Enables the actions over the sdcard import/export functionality
   * @param {Boolean} cardAvailable Whether functions should be enabled or not.
   */
  var updateStorageOptions = function updateStorageOptions(cardAvailable) {
    // Enable/Disable button and shows/hides error message
    updateOptionStatus(importSDOption, !cardAvailable, true);
    updateOptionStatus(exportSDOption, !cardAvailable, true);

    var importSDErrorL10nId = null;
    var exportSDErrorL10nId = null;

    var cardShared = utils.sdcard.status === utils.sdcard.SHARED;
    if (!cardAvailable) {
      importSDErrorL10nId = 'noMemoryCardMsg';
      exportSDErrorL10nId = 'noMemoryCardMsgExport';

      if (cardShared) {
        importSDErrorL10nId = exportSDErrorL10nId = 'memoryCardUMSEnabled';
      }
    }

    // update the message
    var importSDErrorNode = importSDOption.querySelector('p.error-message');
    if (importSDErrorL10nId) {
      importSDErrorNode.setAttribute('data-l10n-id', importSDErrorL10nId);
    } else {
      importSDErrorNode.removeAttribute('data-l10n-id');
      importSDErrorNode.textContent = '';
    }

    var exportSDErrorNode = exportSDOption.querySelector('p');
    if (exportSDErrorL10nId) {
      exportSDErrorNode.setAttribute('data-l10n-id', exportSDErrorL10nId);
    } else {
      exportSDErrorNode.removeAttribute('data-l10n-id');
      exportSDErrorNode.textContent = '';
    }

  };

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Loader.utility('Overlay', callback);
  }

  /**
   * Loads required libraries for sim import
   */
  function requireSimImport(callback) {
    var libraries = ['Overlay', 'Import_sim_contacts'];
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

  function resetWait(wakeLock) {
    Contacts.hideOverlay();
    if (wakeLock) {
      wakeLock.unlock();
    }
  }

  // Listens for any change in the ordering preferences
  var onOrderingChange = function onOrderingChange(evt) {
    newOrderByLastName = orderCheckBox.checked;
    updateOrderingUI();
  };

  // Import contacts from SIM card and updates ui
  var onSimImport = function onSimImport(iccId, done) {
    var icc = IccHandler.getIccById(iccId);
    if (icc === null) {
      return;
    }
    var progress = Contacts.showOverlay('simContacts-reading',
      'activityBar');

    var wakeLock = navigator.requestWakeLock('cpu');

    var cancelled = false, contactsRead = false;
    var importer = new SimContactsImporter(icc);
    utils.overlay.showMenu();
    utils.overlay.oncancel = function oncancel() {
      cancelled = true;
      importer.finish();
      if (contactsRead) {
        // A message about canceling will be displayed while the current chunk
        // is being cooked
        progress.setClass('activityBar');
        utils.overlay.hideMenu();
        progress.setHeaderMsg('messageCanceling');
      } else {
        importer.onfinish(); // Early return while reading contacts
      }
    };
    var totalContactsToImport;
    var importedContacts = 0;
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;

    importer.onread = function import_read(n) {
      contactsRead = true;
      totalContactsToImport = n;
      if (totalContactsToImport > 0) {
        progress.setClass('progressBar');
        progress.setHeaderMsg('simContacts-importing');
        progress.setTotal(totalContactsToImport);
      }
    };

    importer.onfinish = function import_finish(numDupsMerged) {
      window.setTimeout(function onfinish_import() {
        resetWait(wakeLock);
        if (importedContacts > 0) {
          var source = 'sim-' + iccId;
          utils.misc.setTimestamp(source, function() {
            // Once the timestamp is saved, update the list
            updateTimestamps();
            checkNoContacts();
          });
        }
        if (!cancelled) {
          utils.status.show({
            id: 'simContacts-imported3',
            args: {
              n: importedContacts
            }
          },
          !numDupsMerged ? null : {
            id: 'contactsMerged',
            args: {
              numDups: numDupsMerged
            }
          });
        }

        typeof done === 'function' && done();

      }, DELAY_FEEDBACK);

      importer.onfinish = null;
    };

    importer.onimported = function imported_contact() {
      importedContacts++;
      if (!cancelled) {
        progress.update();
      }
    };

    importer.onerror = function import_error() {
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
      resetWait(wakeLock);
    };

    importer.start();
  };

  var onSdImport = function onSdImport(cb) {
    var cancelled = false;
    var importer = null;
    var progress = Contacts.showOverlay(
      'memoryCardContacts-reading', 'activityBar');
    utils.overlay.showMenu();
    utils.overlay.oncancel = function() {
      cancelled = true;
      importer ? importer.finish() : Contacts.hideOverlay();
    };
    var wakeLock = navigator.requestWakeLock('cpu');

    var importedContacts = 0;
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;

    utils.sdcard.retrieveFiles([
      'text/vcard',
      'text/x-vcard',
      'text/directory;profile=vCard',
      'text/directory'
    ], ['vcf', 'vcard'], function(err, fileArray) {
      if (err) {
        return import_error(err, cb);
      }

      if (cancelled) {
        return;
      }

      if (fileArray.length) {
        utils.sdcard.getTextFromFiles(fileArray, '', onFiles);
      } else {
        import_error('No contacts were found.', cb);
      }
    });

    function onFiles(err, text) {
      if (err) {
        return import_error(err, cb);
      }

      if (cancelled) {
        return;
      }

      importer = new VCFReader(text);
      if (!text || !importer) {
        return import_error('No contacts were found.', cb);
      }

      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish(total, numDupsMerged) {
        window.setTimeout(function onfinish_import() {
          utils.misc.setTimestamp('sd', function() {
            // Once the timestamp is saved, update the list
            updateTimestamps();
            checkNoContacts();
            resetWait(wakeLock);

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

              if (typeof cb === 'function') {
                cb();
              }
            }
          });
        }, DELAY_FEEDBACK);
      });
    }

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg('memoryCardContacts-importing');
      progress.setTotal(n);
    }

    function imported_contact() {
      importedContacts++;
      progress.update();
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
      ConfirmDialog.show(null, 'memoryCardContacts-error', cancel,
        retry);
      resetWait(wakeLock);
      if (typeof cb === 'function') {
        cb();
      }
    }
  };

  // Dismiss settings window and execute operations if values got modified
  var close = function close() {
    if (newOrderByLastName != null &&
        newOrderByLastName != orderByLastName && contacts.List) {
      contacts.List.setOrderByLastName(newOrderByLastName);
      utils.cookie.update({order: newOrderByLastName});
      Cache.evict();
      // Force the reset of the dom, we know that we changed the order
      contacts.List.load(null, true);
      orderByLastName = newOrderByLastName;
    }

    Contacts.goBack();
  };

  var checkOnline = function() {
    // Perform pending automatic logouts
    window.setTimeout(automaticLogout, 0);

    // Other import services settings
    updateOptionStatus(importGmailOption, !navigator.onLine, true);
    updateOptionStatus(importLiveOption, !navigator.onLine, true);
  };

  var checkNoContacts = function checkNoContacts() {
    var exportButton = exportContacts.firstElementChild;

    ContactsService.isEmpty(function(error, isEmpty) {
      if (error) {
        window.console.warn(
          'Error while trying to know the contact number',
          error
        );
        // In case of error is safer to leave enabled
        exportButton.removeAttribute('disabled');
        bulkDeleteButton.removeAttribute('disabled');
        return;
      }
      if (isEmpty) {
        exportButton.setAttribute('disabled', 'disabled');
        bulkDeleteButton.setAttribute('disabled', 'disabled');
        setICEButton.setAttribute('disabled', 'disabled');
      } else {
        exportButton.removeAttribute('disabled');
        bulkDeleteButton.removeAttribute('disabled');
        setICEButton.removeAttribute('disabled');
      }
    });
  };

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
              window.console.log('Successfully logged out: ', service);
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

  var updateTimestamps = function updateTimestamps() {
    // TODO Add the same functionality to 'EXPORT' methods when ready.
    var importSources =
      document.querySelectorAll('#import-options li[data-source]');
    Array.prototype.forEach.call(importSources, function(node) {
      utils.misc.getTimestamp(node.dataset.source,
                                      function(time) {
        var spanID = 'notImported';
        if (time) {
          spanID = 'imported';
          var timeElement = node.querySelector('p > time');
          timeElement.setAttribute('datetime',
                                             (new Date(time)).toLocaleString());
          timeElement.textContent = utils.time.pretty(time);
        }
        node.querySelector('p > span').setAttribute('data-l10n-id', spanID);
      });
    });
  };

  var refresh = function refresh() {
    getData();
    checkOnline();
    checkSIMCard();
    utils.sdcard.getStatus(function statusUpdated() {
      updateStorageOptions(utils.sdcard.checkStorageCard());
    });
    updateTimestamps();
    checkNoContacts();
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'cardStateChanged': checkSIMCard,
    'updateTimestamps': updateTimestamps,
    'showICEScreen' : showICEScreen,
    get navigation() { return navigationHandler; },
    'importFromSDCard': onSdImport,
    'importFromSIMCard': onSimImport
  };
})();
