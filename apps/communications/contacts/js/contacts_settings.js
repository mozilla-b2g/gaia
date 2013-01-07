'use strict';

var contacts = window.contacts || {};

/***
  This class handles all the activity regarding
  the settings screen for contacts
**/
contacts.Settings = (function() {

  var orderCheckbox,
      orderByLastName,
      simImportLink,
      fbImportOption,
      fbImportCheck,
      fbUpdateButton,
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
      updateOrderingUI();
    }).bind(this));

    if (fb.isEnabled) {
      fb.utils.getImportChecked(checkFbImported);
    }
  };

  var updateOrderingUI = function updateOrderingUI() {
    var value = newOrderByLastName === null ? orderByLastName :
      newOrderByLastName;
    orderCheckbox.checked = value;
  };

  var cleanMessage = function cleanMessage() {
    var msg = document.getElementById('taskResult');
    if (msg) {
      msg.parentNode.removeChild(msg);
    }
  };

  // Initialises variables and listener for the UI
  var initContainers = function initContainers() {
    orderCheckbox = document.querySelector('[name="order.lastname"]');
    orderCheckbox.addEventListener('change', onOrderingChange.bind(this));

    simImportLink = document.querySelector('[data-l10n-id="importSim"]');
    simImportLink.addEventListener('click',
      onSimImport);

    if (fb.isEnabled) {
      fbImportOption = document.querySelector('#settingsFb');
      document.querySelector('#settingsFb > .fb-item').onclick = onFbEnable;

      fbImportCheck = document.querySelector('[name="fb.imported"]');

      fbUpdateButton = document.querySelector('#import-fb');
      fbUpdateButton.onclick = Contacts.extFb.importFB;
      fbTotalsMsg = document.querySelector('#fb-totals');
      fbPwdRenewMsg = document.querySelector('#renew-pwd-msg');

      document.addEventListener('fb_changed', function onFbChanged(evt) {
        // We just received an event saying something might be changed
        fbGetTotals(false);
      });

      document.addEventListener('fb_token_ready', function onFbCTokenReady(evt) {
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

   var addMessage = function addMessage(message, after) {
      var li = document.createElement('li');
      li.id = 'taskResult';
      li.classList.add('result');
      var span = document.createElement('span');
      span.innerHTML = message;
      li.appendChild(span);

      after.parentNode.insertBefore(li, after.nextSibling);
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

  function doFbUnlink() {
    Contacts.showOverlay(_('cleaningFbData'));

    var req = fb.utils.clearFbData();

    req.onsuccess = function() {
      req.result.onsuccess = function() {

        Contacts.showOverlay(_('loggingOutFb'));
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

          contacts.List.load();
          Contacts.hideOverlay();
        };

        logoutReq.onerror = function(e) {
          contacts.List.load();
          Contacts.hideOverlay();
          window.console.error('Contacts: Error while FB logout: ',
                              e.target.error);
        };
      };

      req.result.oncleaned = function(num) {
        // Nothing done here for the moment
      };

      req.result.onerror = function(error) {
        window.console.error('Contacts: Error while FB cleaning');
        Contacts.hideOverlay();
      };
    };
  }

  // Listens for any change in the ordering preferences
  var onOrderingChange = function onOrderingChange(evt) {
    newOrderByLastName = evt.target.checked;
    asyncStorage.setItem(ORDER_KEY, newOrderByLastName);
    updateOrderingUI();
  };

  // Import contacts from SIM card and updates ui
  var onSimImport = function onSimImport(evt) {
    // Auto remove previous message if present
    cleanMessage();

    Contacts.showOverlay(_('simContacts-importing'));
    var after = document.getElementById('settingsSIM');

    importSIMContacts(
      function onread() {

      },
      function onimport(num) {
        addMessage(_('simContacts-imported2', {n: num}), after);
        contacts.List.load();
        Contacts.hideOverlay();
      },
      function onerror() {
        addMessage(_('simContacts-error'), after);
        Contacts.hideOverlay();
      });
  };

  // Dismiss settings window and execute operations if values got modified
  var close = function close() {
    if (newOrderByLastName != orderByLastName && contacts.List) {
      contacts.List.setOrderByLastName(newOrderByLastName);
      orderByLastName = newOrderByLastName;
    }

    // Clean possible messages
    cleanMessage();
    Contacts.goBack();
  };

  var checkOnline = function() {
    if (fb.isEnabled) {
      if (navigator.onLine === true) {
        fbImportOption.querySelector('li').removeAttribute('aria-disabled');
        fbUpdateButton.removeAttribute('disabled');
      }
      else {
        fbImportOption.querySelector('li.fb-item').setAttribute('aria-disabled',
                                                              'true');
        fbUpdateButton.removeAttribute('disabled');
        fbUpdateButton.setAttribute('disabled', 'disabled');
      }
    }
  };

  var refresh = function refresh() {
    getData();
    checkOnline();
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'onLineChanged': checkOnline
  };
})();
