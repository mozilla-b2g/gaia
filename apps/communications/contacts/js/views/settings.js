'use strict';

var contacts = window.contacts || {};

/***
 This class handles all the activity regarding
 the settings screen for contacts
 **/
contacts.Settings = (function() {

  var navigationHandler,
    importSettingsBack,
    orderCheckBox,
    orderByLastName,
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
    fbImportOption,
    fbImportCheck,
    fbUpdateButton,
    fbOfflineMsg,
    noSimMsg,
    noMemoryCardMsg,
    fbTotalsMsg,
    fbPwdRenewMsg,
    fbImportedValue,
    newOrderByLastName = null,
    ORDER_KEY = 'order.lastname',
    PENDING_LOGOUT_KEY = 'pendingLogout',
    umsSettingsKey = 'ums.enabled';

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    // Create the DOM for our SIM cards and listen to any changes
    IccHandler.init(new SimDomGenerator(), contacts.Settings.cardStateChanged);

    fb.init(function onFbInit() {
      initContainers();
    });
    utils.listeners.add({
      '#settings-close': hideSettings
    });
    if (navigator.mozSettings) {
      navigator.mozSettings.addObserver(umsSettingsKey, function(evt) {
        enableStorageOptions(!evt.settingValue, 'sdUMSEnabled');
      });
    }

    // Subscribe to events related to change state in the sd card
    utils.sdcard.subscribeToChanges('check_sdcard', function(value) {
      enableStorageOptions(utils.sdcard.checkStorageCard());
    });
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

    if (fb.isEnabled) {
      fb.utils.getImportChecked(checkFbImported);
    }
  };

  var updateOrderingUI = function updateOrderingUI() {
    var value = newOrderByLastName === null ? orderByLastName :
      newOrderByLastName;
    orderCheckBox.checked = value;
  };

  var updateImportTitle = function updateImportTitle(l10nString) {
    importSettingsTitle.dataset.l10nId = l10nString;
    importSettingsTitle.innerHTML = _(l10nString);
  };

  // Initialises variables and listener for the UI
  var initContainers = function initContainers() {
    var orderItem = document.getElementById('settingsOrder');
    orderCheckBox = orderItem.querySelector('[name="order.lastname"]');
    orderItem.addEventListener('click', onOrderingChange.bind(this));
    // Creating a navigation handler from this view
    navigationHandler = new navigationStack('view-settings');

    // Init panel & elements for caching them
    importSettingsPanel = document.getElementById('import-settings');
    importSDOption = document.getElementById('import-sd-option');
    exportSDOption = document.getElementById('export-sd-option');
    importSettingsTitle = document.getElementById('import-settings-title');
    importLiveOption = document.getElementById('import-gmail-option');
    importGmailOption = document.getElementById('import-live-option');

    /*
     * Adding listeners
     */

    // Listener for updating the timestamp based on extServices
    window.addEventListener('message', function updateList(e) {
      if (e.data.type === 'import_updated') {
        updateTimestamps();
        checkExport();
      }
    });

    // Navigation back
    importSettingsBack = document.getElementById('import-settings-back');
    importSettingsBack.addEventListener('click', importSettingsBackHandler);

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

    if (fb.isEnabled) {
      fbImportOption = document.querySelector('#settingsFb');
      document.querySelector('#settingsFb > .fb-item').onclick = onFbEnable;

      fbImportCheck = document.querySelector('[name="fb.imported"]');

      fbUpdateButton = document.querySelector('#import-fb');
      fbOfflineMsg = document.querySelector('#no-connection');
      fbUpdateButton.onclick = Contacts.extServices.importFB;
      fbTotalsMsg = document.querySelector('#fb-totals');
      fbPwdRenewMsg = document.querySelector('#renew-pwd-msg');

      document.addEventListener('fb_changed', function onFbChanged(evt) {
        // We just received an event saying something might be changed
        fbGetTotals(false);
      });

      document.addEventListener('fb_token_ready', function onTokenReady(evt) {
        // We just received an event saying we imported the contacts
        fb.utils.getImportChecked(checkFbImported);
      });

      document.addEventListener('fb_token_error', function() {
        fbImportedValue = 'renew-pwd';
        fbImportOption.dataset.state = fbImportedValue;
      });
    }
    else {
      document.querySelector('#settings-article').dataset.state = 'fb-disabled';
    }
  };

  // UI event handlers
  function importSettingsBackHandler() {
    navigationHandler.back(function navigateBackHandler() {
        // Removing the previous assigned style for having
        // a clean view
        importSettingsPanel.classList.remove('export');
        importSettingsPanel.classList.remove('import');
    });
  };

  function importContactsHandler() {
      // Hide elements for export and transition
      importSettingsPanel.classList.add('import');
      updateImportTitle('importContactsTitle');
      navigationHandler.go('import-settings', 'right-left');
  };

  function exportContactsHandler() {
      // Hide elements for import and transition
      LazyLoader.load(['/contacts/js/export/contacts_exporter.js'], loadSearch);

      function loadSearch() {
        Contacts.view('search', function() {
          importSettingsPanel.classList.add('export');
          updateImportTitle('exportContactsTitle');
          navigationHandler.go('import-settings', 'right-left');
        });
      }
  };

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
        Contacts.extServices.importGmail();
        break;
      case 'live':
        Contacts.extServices.importLive();
        break;
    }
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
  };

  function doExport(strategy) {
    // Launch the selection mode in the list, and then invoke
    // the export with the selected strategy.
    contacts.List.selectFromList(_('exportContactsAction'),
      function onSelectedContacts(promise) {
        // Resolve the promise, meanwhile show an overlay to
        // warn the user of the ongoin operation, dismiss it
        // once we have the result
        requireOverlay(function _loaded() {
          utils.overlay.show(_('preparing-contacts'), null, 'spinner');
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
      'popup'
    );
  };

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
   * Disables/Enables the actions over the sdcard import functionality
   * @param {Boolean} cardState Whether storage import should be enabled or not.
   * @param {String} alternativeError Provide an alternative message if sd is
   *    not enabled despite that the card is present.
   */
  var enableStorageOptions = function enableStorageOptions(cardState,
    alternativeError) {
    updateOptionStatus(importSDOption, !cardState, true);
    updateOptionStatus(exportSDOption, !cardState, true);

    var importSDErrorMessage = 'noMemoryCardMsg';
    var exportSDErrorMessage = 'noMemoryCardMsgExport';
    if (alternativeError) {
      importSDErrorMessage = exportSDErrorMessage = alternativeError;
    }

    importSDOption.querySelector('p.error-message').textContent =
      _(importSDErrorMessage);
    exportSDOption.querySelector('p').textContent =
      _(exportSDErrorMessage);
  };

  // Callback that will modify the ui depending if we imported or not
  // contacts from FB
  var checkFbImported = function checkFbImportedCb(value) {
    fbImportedValue = value;
    // Changing the state thus the CSS will select the correct values
    fbImportOption.dataset.state = fbImportedValue;

    if (fbImportedValue === 'logged-in') {
      fbSetEnabledState();
    }
    else if (fbImportedValue === 'logged-out') {
      fbSetDisabledState();
      fbTotalsMsg.textContent = _('notEnabledYet');
    }
    else if (fbImportedValue === 'renew-pwd') {
      fbSetEnabledState();
    }
  };

  function fbSetEnabledState() {
    fbGetTotals();

    fbImportCheck.checked = true;
  }

  function fbSetDisabledState() {
    fbImportCheck.checked = false;
  }

  // Get total number of contacts imported from fb
  var fbGetTotals = function fbGetTotals(requestRemoteData) {
    var req = fb.utils.getNumFbContacts();

    req.onsuccess = function() {
      var friendsOnDevice = req.result;

      var callbackListener = {
        'local': function localContacts(number) {
          fbUpdateTotals(friendsOnDevice, number);
        },
        'remote': function remoteContacts(number) {
          fbUpdateTotals(friendsOnDevice, number);
        }
      };

      // Do not ask for remote data if not necessary
      if (requestRemoteData === false) {
        callbackListener.remote = null;
      }

      fb.utils.numFbFriendsData(callbackListener);
    };

    req.onerror = function() {
      console.error('Could not get number of local contacts');
    };
  };

  /**
   * Loads the overlay class before showing
   */
  function requireOverlay(callback) {
    Contacts.utility('Overlay', callback);
  }

  /**
   * Loads required libraries for sim import
   */
  function requireSimImport(callback) {

    var libraries = ['Overlay', 'Import_sim_contacts'];
    var pending = libraries.length;

    libraries.forEach(function onPending(library) {
      Contacts.utility(library, next);
    });

    function next() {
      if (!(--pending)) {
        callback();
      }
    }
  }

  var fbUpdateTotals = function fbUpdateTotals(imported, total) {
    // If the total is not available then an empty string is showed
    var theTotal = total || '';

    var totalsMsgContent = _('facebook-import-msg', {
      'imported': imported,
      'total': theTotal
    });

    // This is to support the case of a long literal, particularly
    // when 0 or 1 friends are imported
    var msgPart1 = totalsMsgContent;
    var msgPart2 = null;
    if (imported <= 1) {
      var position = totalsMsgContent.indexOf('(');
      if (position != -1) {
        msgPart1 = totalsMsgContent.substring(0, position - 1);
        msgPart2 = totalsMsgContent.substring(position);
      }
    }
    fbTotalsMsg.innerHTML = '';
    fbTotalsMsg.appendChild(document.createTextNode(msgPart1));
    if (msgPart2) {
      var span = document.createElement('span');
      span.textContent = msgPart2;
      fbTotalsMsg.appendChild(span);
    }
  };

  var onFbImport = function onFbImportClick(evt) {
    Contacts.extServices.importFB();
  };

  var onFbEnable = function onFbEnable(evt) {
    var WAIT_UNCHECK = 400;

    evt.preventDefault();
    evt.stopPropagation();

    if (fbImportedValue === 'logged-out') {
      fbImportCheck.checked = true;
      // For starting we wait for the switch transition to give feedback
      window.addEventListener('transitionend', function transendCheck(e) {
        if (e.target.id === 'span-check-fb') {
          window.removeEventListener('transitionend', transendCheck);
          onFbImport();
          // We need to uncheck just in case the user closes the window
          // without logging in (we don't have any mechanism to know that fact)
          window.setTimeout(function() {
            fbImportCheck.checked = false;
          }, WAIT_UNCHECK);
        }
      });
    }
    else {
      fbImportCheck.checked = false;
      // For starting we wait for the switch transition to give feedback
      window.addEventListener('transitionend', function fb_remove_all(e) {
        if (e.target.id === 'span-check-fb') {
          window.removeEventListener('transitionend', fb_remove_all);
          var msg = _('cleanFbConfirmMsg');
          var yesObject = {
            title: _('remove'),
            isDanger: true,
            callback: function() {
              ConfirmDialog.hide();
              requireOverlay(doFbUnlink);
            }
          };

          var noObject = {
            title: _('cancel'),
            callback: function onCancel() {
              fbImportCheck.checked = true;
              ConfirmDialog.hide();
            }
          };

          Contacts.confirmDialog(null, msg, noObject, yesObject);
        }
      });
    }
  };

  function resetWait(wakeLock) {
    Contacts.hideOverlay();
    if (wakeLock) {
      wakeLock.unlock();
    }
  }

  function doFbUnlink() {
    var progressBar = Contacts.showOverlay(_('cleaningFbData'), 'progressBar');
    var wakeLock = navigator.requestWakeLock('cpu');

    var req = fb.utils.clearFbData();

    req.onsuccess = function() {
      var cleaner = req.result;
      progressBar.setTotal(cleaner.lcontacts.length);
      cleaner.onsuccess = function() {
        Contacts.showOverlay(_('loggingOutFb'), 'activityBar');
        var logoutReq = fb.utils.logout();

        logoutReq.onsuccess = function() {
          checkFbImported('logged-out');
          // And it is needed to clear any previously set alarm
          window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
            if (data) {
              navigator.mozAlarms.remove(Number(data));
            }
            window.asyncStorage.removeItem(fb.utils.ALARM_ID_KEY);
          });

          window.asyncStorage.removeItem(fb.utils.LAST_UPDATED_KEY);
          window.asyncStorage.removeItem(fb.utils.CACHE_FRIENDS_KEY);

          resetWait(wakeLock);
        };

        logoutReq.onerror = function(e) {
          resetWait(wakeLock);
          window.console.error('Contacts: Error while FB logout: ',
            e.target.error);
        };
      };

      cleaner.oncleaned = function(num) {
        progressBar.update();
      };

      cleaner.onerror = function(contactid, error) {
        window.console.error('Contacts: Error while FB cleaning contact: ',
          contactid, 'Error: ', error.name);
        // Wait state is not resetted because the cleaning process will continue
      };
    };

    req.onerror = function(e) {
      window.console.error('Error while starting the cleaning operations',
        req.error.name);
      resetWait(wakeLock);
    };
  }

  // Listens for any change in the ordering preferences
  var onOrderingChange = function onOrderingChange(evt) {
    newOrderByLastName = !orderCheckBox.checked;
    utils.cookie.update({order: newOrderByLastName});
    updateOrderingUI();
  };

  // Import contacts from SIM card and updates ui
  var onSimImport = function onSimImport(iccId) {
    var icc = IccHandler.getIccById(iccId);
    if (icc === null) {
      return;
    }
    var progress = Contacts.showOverlay(_('simContacts-reading'),
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
        progress.setHeaderMsg(_('messageCanceling'));
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
        progress.setHeaderMsg(_('simContacts-importing'));
        progress.setTotal(totalContactsToImport);
      }
    };

    importer.onfinish = function import_finish() {
      window.setTimeout(function onfinish_import() {
        resetWait(wakeLock);
        if (importedContacts > 0) {
          var source = 'sim-' + iccId;
          window.importUtils.setTimestamp(source, function() {
            // Once the timestamp is saved, update the list
            updateTimestamps();
            checkExport();
          });
        }
        if (!cancelled) {
          Contacts.showStatus(_('simContacts-imported3', {
            n: importedContacts
          }));
        }
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
        title: _('cancel'),
        callback: function() {
          ConfirmDialog.hide();
        }
      };
      var retry = {
        title: _('retry'),
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          window.setTimeout(requireSimImport.bind(this,
            onSimImport.bind(this, iccId)), 0);
        }
      };
      Contacts.confirmDialog(null, _('simContacts-error'), cancel, retry);
      resetWait(wakeLock);
    };

    importer.start();
  };

  var onSdImport = function onSdImport(cb) {
    var cancelled = false;
    var importer = null;
    var progress = Contacts.showOverlay(
      _('memoryCardContacts-reading'), 'activityBar');
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
      'text/directory;profile=vCard',
      'text/directory'
    ], ['vcf', 'vcard'], function(err, fileArray) {
      if (err)
        return import_error(err, cb);

      if (cancelled)
        return;

      if (fileArray.length)
        utils.sdcard.getTextFromFiles(fileArray, '', onFiles);
      else
        import_error('No contacts were found.', cb);
    });

    function onFiles(err, text) {
      if (err)
        return import_error(err, cb);

      if (cancelled)
        return;

      importer = new VCFReader(text);
      if (!text || !importer)
        return import_error('No contacts were found.', cb);

      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish() {
        window.setTimeout(function onfinish_import() {
          window.importUtils.setTimestamp('sd', function() {
            // Once the timestamp is saved, update the list
            updateTimestamps();
            checkExport();
            resetWait(wakeLock);
            if (!cancelled) {
              Contacts.showStatus(_('memoryCardContacts-imported3', {
                n: importedContacts
              }));
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
      progress.setHeaderMsg(_('memoryCardContacts-importing'));
      progress.setTotal(n);
    }

    function imported_contact() {
      importedContacts++;
      progress.update();
    }

    function import_error(e, cb) {
      var cancel = {
        title: _('cancel'),
        callback: function() {
          ConfirmDialog.hide();
        }
      };

      var retry = {
        title: _('retry'),
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          window.setTimeout(requireOverlay.bind(this, onSdImport), 0);
        }
      };
      Contacts.confirmDialog(null, _('memoryCardContacts-error'), cancel,
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
      // Force the reset of the dom, we know that we changed the order
      contacts.List.load(null, true);
      orderByLastName = newOrderByLastName;
    }

    Contacts.goBack();
  };

  var checkOnline = function() {
    // Perform pending automatic logouts
    window.setTimeout(automaticLogout, 0);

    // Facebook settings
    if (fb.isEnabled) {
      if (navigator.onLine === true) {
        fbImportOption.querySelector('li').removeAttribute('aria-disabled');
        fbUpdateButton.classList.remove('hide');
        fbOfflineMsg.classList.add('hide');
      } else {
        fbImportOption.querySelector('li.fb-item').setAttribute('aria-disabled',
          'true');
        fbUpdateButton.classList.add('hide');
        fbOfflineMsg.classList.remove('hide');
      }
    }

    // Other import services settings
    updateOptionStatus(importGmailOption, !navigator.onLine, true);
    updateOptionStatus(importLiveOption, !navigator.onLine, true);
  };

  var checkExport = function checkExport() {
    var exportButton = exportContacts.firstElementChild;
    var req = navigator.mozContacts.getCount();
    req.onsuccess = function() {
      if (req.result === 0) {
        exportButton.setAttribute('disabled', 'disabled');
      }
      else {
         exportButton.removeAttribute('disabled');
      }
    };

    req.onerror = function() {
      window.console.warn('Error while trying to know the contact number',
                          req.error.name);
      // In case of error is safer to leave enabled
      exportButton.removeAttribute('disabled');
    };
  };

  function saveStatus(data) {
    window.asyncStorage.setItem(PENDING_LOGOUT_KEY, data);
  }

  function automaticLogout() {
    if (navigator.offLine === true) {
      return;
    }

    LazyLoader.load(['/contacts/js/utilities/http_rest.js'], function() {
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
      window.importUtils.getTimestamp(node.dataset.source,
                                      function(time) {
        var spanID = 'notImported';
        if (time) {
          spanID = 'imported';
          var timeElement = node.querySelector('p > time');
          timeElement.setAttribute('datetime',
                                             (new Date(time)).toLocaleString());
          timeElement.textContent = utils.time.pretty(time);
        }
        node.querySelector('p > span').textContent = _(spanID);
      });
    });
  };

  var refresh = function refresh() {
    getData();
    checkOnline();
    checkSIMCard();
    enableStorageOptions(utils.sdcard.checkStorageCard());
    updateTimestamps();
    checkExport();
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'onLineChanged': checkOnline,
    'cardStateChanged': checkSIMCard,
    'updateTimestamps': updateTimestamps,
    'navigation': navigationHandler,
    'importFromSDCard': onSdImport
  };
})();
