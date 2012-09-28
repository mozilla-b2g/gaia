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

  var updateOrderingUI = function updateOrdering() {
    var value = newOrderByLastName === null ? orderByLastName : newOrderByLastName;
    orderCheckbox.checked = value;
  }

  var cleanSimImportMessage = function cleanImportMessage() {
    var numItems = simImportLink.parentNode.children.length;
    if (numItems != 1) {
      var parent = simImportLink.parentNode;
      for (var i = 1; i < numItems; i++) {
        parent.removeChild(parent.children[i]);
      }
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
    fb.utils.getImportChecked(function fbImported(value) {
      fbImportedValue = value;
      if (fbImportedValue) {
        fbImportLink.innerHTML = 'Facebook';
        fbAddUnlinkOption();
      }
    });
    fbImportLink.addEventListener('click', onFbImport);
  };

  // Insert the dom necessary to unlink your FB contacts
  var fbAddUnlinkOption = function fbUnlinkOption() {
    var label = document.createElement('label');
    label.classList.add('switch');
    label.innerHTML = '<input type="checkbox" checked="true" name="fb.imported" />';
    label.innerHTML += '<span></span>';

    fbImportLink.parentNode.insertBefore(label, fbImportLink);

    document.querySelector('[name="fb.imported"]').addEventListener('click',
      onFbUnlink);
  }

  var onFbImport = function onFbImportClick(evt) {
    console.log('Fb import!!');
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

    var addMessage = function (message) {
      var p = document.createElement('p');
      p.innerHTML = message;
      simImportLink.parentNode.appendChild(p);
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