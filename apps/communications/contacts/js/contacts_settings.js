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
      fbImportLink,
      labelLink,
      fbImportedValue,
      newOrderByLastName = null,
      ORDER_KEY = 'order.lastname';

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    initContainers();

    getData();

    checkOnline();
  };

  // Get the different values that we will show in the app
  var getData = function getData() {
    // Ordering
    asyncStorage.getItem(ORDER_KEY, (function orderValue(value) {
      orderByLastName = value || false;
      updateOrderingUI();
    }).bind(this));
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

    fbImportLink = document.querySelector('[data-l10n-id="importFb"]');
    document.addEventListener('fb_imported', function onImported(evt) {
      // We just received an event saying we imported the contacts
       fb.utils.getImportChecked(checkFbImported);
    });
    fb.utils.getImportChecked(checkFbImported);
    fbImportLink.addEventListener('click', onFbImport);
  };

  // Callback that will modify the ui depending if we imported or not
  // contacts from FB
  var checkFbImported = function checkFbImportedCb(value) {
    fbImportedValue = value;
    if (fbImportedValue) {
      fbImportLink.textContent = _('facebook');
      fbAddUnlinkOption();
      fbGetTotals();
    }
    else {
      if (labelLink) {
        fbImportLink.textContent = _('importFb');
        fbImportLink.parentNode.removeChild(labelLink);
        labelLink = null;
        cleanFbContactsMessage();
      }
    }
  };

  // Get total number of contacts imported from fb
  var fbGetTotals = function fbGetTotals() {
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

      fb.utils.numFbFriendsData(callbackListener);
    };

    req.onerror = function() {
      console.error('Could not get number of local contacts');
    };
  };

  var fbUpdateTotals = function fbUpdateTotals(imported, total) {

    // If the total is not available then an empty string is showed
    var theTotal = total || '';
    var span;

    if (!document.getElementById('fbTotalsResult')) {
      var li = document.createElement('li');
      li.id = 'fbTotalsResult';
      li.classList.add('result');
      span = document.createElement('span');
      li.appendChild(span);

      li.onclick = Contacts.extFb.importFB;

      var after = document.getElementById('settingsFb');
      after.parentNode.insertBefore(li, after.nextSibling);
    }
    else {
      span = document.querySelector('#fbTotalsResult span');
    }

    span.textContent = _('facebook-import-msg', {
      'imported': imported,
      'total': theTotal
    });

  };

  var cleanFbContactsMessage = function cleanFbContactsMessage() {
    var fbTotalsMessage = document.getElementById('fbTotalsResult');
    if (fbTotalsMessage) {
      fbTotalsMessage.parentNode.removeChild(fbTotalsMessage);
    }
  };

  // Insert the dom necessary to unlink your FB contacts
  var fbAddUnlinkOption = function fbUnlinkOption() {
    if (!labelLink) {
      labelLink = document.createElement('label');
      labelLink.classList.add('switch');
      labelLink.innerHTML = '<input type="checkbox" checked="true" ' +
        'name="fb.imported" />';
      labelLink.innerHTML += '<span></span>';

      fbImportLink.parentNode.insertBefore(labelLink, fbImportLink);

      document.querySelector('[name="fb.imported"]').addEventListener('click',
        onFbUnlink);
    }
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

  var onFbUnlink = function onFbUnlink(evt) {
    evt.preventDefault();
    evt.stopPropagation();

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
        ConfirmDialog.hide();
      }
    };

    ConfirmDialog.show(null, msg, noObject, yesObject);
  };

  function doFbUnlink() {
    Contacts.showOverlay(_('cleaningFbData'));

    var req = fb.utils.clearFbData();

    req.onsuccess = function() {
      req.result.onsuccess = function() {

        Contacts.showOverlay(_('loggingOutFb'));
        var logoutReq = fb.utils.logout();

        logoutReq.onsuccess = function() {
          checkFbImported(false);
          // And it is needed to clear any previously set alarm
          window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
            if (data) {
              navigator.mozAlarms.remove(Number(data));
              window.asyncStorage.removeItem(fb.utils.ALARM_ID_KEY);
              window.asyncStorage.removeItem(fb.utils.LAST_UPDATED_KEY);
              window.asyncStorage.removeItem(fb.utils.CACHE_FRIENDS_KEY);
            }
          });
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
    var disableElement = document.querySelector('#fbTotalsResult');
    if (navigator.onLine === true) {
      fbImportLink.parentNode.removeAttribute('aria-disabled');
      if (disableElement) {
        disableElement.removeAttribute('aria-disabled');
      }
    }
    else {
      fbImportLink.parentNode.setAttribute('aria-disabled', 'true');
      if (disableElement) {
        disableElement.setAttribute('aria-disabled', 'true');
      }
    }
  };

  var refresh = function refresh() {
    if (document.getElementById('fbTotalsResult')) {
      fbGetTotals();
    }
  };

  return {
    'init': init,
    'close': close,
    'refresh': refresh,
    'onLineChanged': checkOnline
  };
})();
