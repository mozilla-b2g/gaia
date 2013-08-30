'use strict';

var contacts = window.contacts || {};

/***
 This class handles all the activity regarding
 the settings screen for contacts
 **/
contacts.Settings = (function() {

  var orderCheckBox,
    orderByLastName,
    simImportLink,
    sdImportLink,
    importLiveButton,
    importGmailButton,
    fbImportOption,
    fbImportCheck,
    fbUpdateButton,
    fbOfflineMsg,
    noSimMsg,
    noSdMsg,
    fbTotalsMsg,
    fbPwdRenewMsg,
    fbImportedValue,
    newOrderByLastName = null,
    ORDER_KEY = 'order.lastname',
    PENDING_LOGOUT_KEY = 'pendingLogout';

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    // To listen to card state changes is needed for enabling import from SIM
    var mobileConn = navigator.mozMobileConnection;
    mobileConn.oncardstatechange = Contacts.cardStateChanged;
    fb.init(function onFbInit() {
      initContainers();
    });
  };

  // Get the different values that we will show in the app
  var getData = function getData() {
    var order = document.cookie ? JSON.parse(document.cookie).order : false;
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

  // Initialises variables and listener for the UI
  var initContainers = function initContainers() {
    var orderItem = document.getElementById('settingsOrder');
    orderCheckBox = orderItem.querySelector('[name="order.lastname"]');
    orderItem.addEventListener('click', onOrderingChange.bind(this));

    simImportLink = document.querySelector('[data-l10n-id="importSim2"]');
    simImportLink.addEventListener('click', function onSimImportHandler() {
      window.setTimeout(onSimImport, 0);
    });

    noSimMsg = document.querySelector('#no-sim');

    sdImportLink = document.querySelector('[data-l10n-id="importSd"]');
    sdImportLink.addEventListener('click', function onSimImportHandler() {
      window.setTimeout(onSdImport, 0);
    });
    noSdMsg = document.querySelector('#no-sd');

    // Gmail & Hotmail import
    importLiveButton = document.querySelector('[data-l10n-id="importOutlook"]');
    importGmailButton = document.querySelector('[data-l10n-id="importGmail"]');

    importLiveButton.onclick = Contacts.extServices.importLive;
    importGmailButton.onclick = Contacts.extServices.importGmail;

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

  var checkSIMCard = function checkSIMCard() {
    var conn = window.navigator.mozMobileConnection;

    if (!conn) {
      enableSIMImport(false);
      return;
    }

    enableSIMImport(conn.cardState);
  };

  // Disables/Enables the actions over the sim import functionality
  var enableSIMImport = function enableSIMImport(cardState) {
    var enable = (cardState === 'ready');
    var importSim = document.getElementById('settingsSIM').firstElementChild;
    if (enable) {
      importSim.removeAttribute('disabled');
      noSimMsg.classList.add('hide');
    }
    else {
      importSim.setAttribute('disabled', 'disabled');
      noSimMsg.classList.remove('hide');
    }
  };

  /**
   * Disables/Enables the actions over the sdcard import functionality
   * @param {Boolean} cardState Whether storage import should be enabled or not.
   */
  var enableStorageImport = function enableStorageImport(cardState) {
    var importStorage = document.getElementById('settingsStorage');
    var importStorageButton = importStorage.firstElementChild;

    if (cardState) {
      importStorage.classList.add('importService');
      importStorageButton.removeAttribute('disabled');
      noSdMsg.classList.add('hide');
    }
    else {
      importStorage.classList.remove('importService');
      importStorageButton.setAttribute('disabled', 'disabled');
      noSdMsg.classList.remove('hide');
    }
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
              doFbUnlink();
            }
          };

          var noObject = {
            title: _('cancel'),
            callback: function onCancel() {
              fbImportCheck.checked = true;
              ConfirmDialog.hide();
            }
          };

          ConfirmDialog.show(null, msg, noObject, yesObject);
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
    document.cookie = JSON.stringify({order: newOrderByLastName});
    updateOrderingUI();
  };

  // Import contacts from SIM card and updates ui
  var onSimImport = function onSimImport(evt) {
    var progress = Contacts.showOverlay(_('simContacts-reading'),
      'activityBar');

    var wakeLock = navigator.requestWakeLock('cpu');

    var importer = new SimContactsImporter();
    var totalContactsToImport;
    var importedContacts = 0;
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 200;

    importer.onread = function import_read(n) {
      totalContactsToImport = n;
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('simContacts-importing'));
      progress.setTotal(totalContactsToImport);
    };

    importer.onfinish = function import_finish() {
      window.setTimeout(function onfinish_import() {
        resetWait(wakeLock);
        Contacts.navigation.home();
        Contacts.showStatus(_('simContacts-imported3',
          {n: importedContacts}));
      }, DELAY_FEEDBACK);
    };

    importer.onimported = function imported_contact() {
      importedContacts++;
      progress.update();
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
          simImportLink.click();
        }
      };
      ConfirmDialog.show(null, _('simContacts-error'), cancel, retry);
      resetWait(wakeLock);
    };

    importer.start();
  };

  var onSdImport = function onSdImport() {
    var progress = Contacts.showOverlay(_('sdContacts-reading'), 'activityBar');
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
      if (err)
        return import_error(err);

      if (fileArray.length)
        utils.sdcard.getTextFromFiles(fileArray, '', onFiles);
      else
        import_error('No contacts were found.');
    });

    function onFiles(err, text) {
      if (err)
        return import_error(err);

      var importer = new VCFReader(text);
      if (!text || !importer)
        return import_error('No contacts were found.');

      importer.onread = import_read;
      importer.onimported = imported_contact;
      importer.onerror = import_error;

      importer.process(function import_finish() {
        window.setTimeout(function onfinish_import() {
          resetWait(wakeLock);
          Contacts.navigation.home();
          Contacts.showStatus(_('sdContacts-imported3', {
            n: importedContacts
          }));
        }, DELAY_FEEDBACK);
      });
    }

    function import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('sdContacts-importing'));
      progress.setTotal(n);
    }

    function imported_contact() {
      importedContacts++;
      progress.update();
    }

    function import_error(e) {
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
          sdImportLink.click();
        }
      };
      ConfirmDialog.show(null, _('sdContacts-error'), cancel, retry);
      resetWait(wakeLock);
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
    if (navigator.onLine === false) {
      importGmailButton.setAttribute('disabled', 'disabled');
      importLiveButton.setAttribute('disabled', 'disabled');
    }
    else {
      importGmailButton.removeAttribute('disabled');
      importLiveButton.removeAttribute('disabled');
    }
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

  var refresh = function refresh() {
    getData();
    checkOnline();
    checkSIMCard();
    enableStorageImport(utils.sdcard.checkStorageCard());
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'onLineChanged': checkOnline,
    'cardStateChanged': checkSIMCard
  };
})();
