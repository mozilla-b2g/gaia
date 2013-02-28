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
      fbImportOption,
      fbImportCheck,
      fbUpdateButton,
      fbOfflineMsg,
      noSimMsg,
      fbTotalsMsg,
      fbPwdRenewMsg,
      fbImportedValue,
      newOrderByLastName = null,
      ORDER_KEY = 'order.lastname';

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    initContainers();
  };

  // Get the different values that we will show in the app
  var getData = function getData() {
    // Ordering
    asyncStorage.getItem(ORDER_KEY, (function orderValue(value) {
      orderByLastName = value || false;
      newOrderByLastName = null;
      updateOrderingUI();
    }).bind(this));

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

    simImportLink = document.querySelector('[data-l10n-id="importSim"]');
    simImportLink.addEventListener('click', function onSimImportHandler() {
      window.setTimeout(onSimImport, 0);
    });

    noSimMsg = document.querySelector('#no-sim');

    if (fb.isEnabled) {
      fbImportOption = document.querySelector('#settingsFb');
      document.querySelector('#settingsFb > .fb-item').onclick = onFbEnable;

      fbImportCheck = document.querySelector('[name="fb.imported"]');

      fbUpdateButton = document.querySelector('#import-fb');
      fbOfflineMsg = document.querySelector('#no-connection');
      fbUpdateButton.onclick = Contacts.extFb.importFB;
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
        msgPart2 = '<span>' + totalsMsgContent.substring(position) + '</span>';
      }
    }

    fbTotalsMsg.innerHTML = msgPart1 + (msgPart2 || '');
  };

  var onFbImport = function onFbImportClick(evt) {
    Contacts.extFb.importFB();
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
          },WAIT_UNCHECK);
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
    updateOrderingUI();
    asyncStorage.setItem(ORDER_KEY, newOrderByLastName);
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
        Contacts.hideOverlay();
    };

    importer.start();
  };

  // Dismiss settings window and execute operations if values got modified
  var close = function close() {
    if (newOrderByLastName != null &&
        newOrderByLastName != orderByLastName && contacts.List) {
      contacts.List.setOrderByLastName(newOrderByLastName);
      orderByLastName = newOrderByLastName;
    }

    Contacts.goBack();
  };

  var checkOnline = function() {
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
  };

  var refresh = function refresh() {
    getData();
    checkOnline();
    checkSIMCard();
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'onLineChanged': checkOnline,
    'cardStateChanged': checkSIMCard
  };
})();
