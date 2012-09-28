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
      fbImportedValue,
      newOrderByLastName = null,
      ORDER_KEY = 'order.lastname';

  // Initialise the settings screen (components, listeners ...)
  var init = function initialize() {
    initContainers();

    getData();
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
  }

  var cleanSimImportMessage = function cleanImportMessage() {
    var simImportMessage = document.getElementById('simImportResult');
    if (simImportMessage) {
      simImportMessage.parentNode.removeChild(simImportMessage);
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
      // We just received an event sayin we imported the contacts
      checkFbImported(true);
    });
    fb.utils.getImportChecked(checkFbImported);
    fbImportLink.addEventListener('click', onFbImport);
  };

  // Callback that will modify the ui depending if we imported or not
  // contacts from FB
  var checkFbImported = function checkFbImportedCb(value) {
    fbImportedValue = value;
    if (fbImportedValue) {
      fbImportLink.innerHTML = 'Facebook';
      fbAddUnlinkOption();
      fbGetTotals();
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
    }

    req.onerror = function() {
      console.error('Could not get number of local contacts');
    }
  };

  var fbUpdateTotals = function fbUpdateTotals(imported, total) {
    cleanFbContactsMessage();

    var li = document.createElement('li');
    li.id = 'fbTotalsResult';
    li.classList.add('result');
    var span = document.createElement('span');
    span.innerHTML = _('facebook-stats', {
      'imported': imported,
      'total': total
    });
    li.appendChild(span);

    var after = document.getElementById('settingsFb');
    after.parentNode.insertBefore(li, after.nextSibling);
  };

  var cleanFbContactsMessage = function cleanFbContactsMessage() {
    var fbTotalsMessage = document.getElementById('fbTotalsResult');
    if (fbTotalsMessage) {
      fbTotalsMessage.parentNode.removeChild(fbTotalsMessage);
    }
  };

  // Insert the dom necessary to unlink your FB contacts
  var fbAddUnlinkOption = function fbUnlinkOption() {
    var label = document.createElement('label');
    label.classList.add('switch');
    label.innerHTML = '<input type="checkbox" checked="true" ' +
      'name="fb.imported" />';
    label.innerHTML += '<span></span>';

    fbImportLink.parentNode.insertBefore(label, fbImportLink);

    document.querySelector('[name="fb.imported"]').addEventListener('click',
      onFbUnlink);
  }

  var onFbImport = function onFbImportClick(evt) {
    Contacts.extFb.importFB();
  };

  var onFbUnlink = function onFbUnlink(evt) {
    console.log('Fb Unlink');
    evt.stopPropagation();
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
    cleanSimImportMessage();

    Contacts.showOverlay(_('simContacts-importing'));

    var addMessage = function addMessage(message) {
      var li = document.createElement('li');
      li.id = 'simImportResult';
      li.classList.add('result');
      var span = document.createElement('span');
      span.innerHTML = message;
      li.appendChild(span);

      var after = document.getElementById('settingsSIM');
      after.parentNode.insertBefore(li, after.nextSibling);
    };

    importSIMContacts(
      function onread() {

      },
      function onimport(num) {
        addMessage(_('simContacts-imported', {n: num}));
        Contacts.hideOverlay();
      },
      function onerror() {
        addMessage(_('simContacts-error'));
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
    cleanSimImportMessage();

    Contacts.goBack();
  };

  return {
    'init': init,
    'close': close
  };
})();
