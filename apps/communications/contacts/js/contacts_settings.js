'use strict';

var contacts = window.contacts || {};

/***
  This class handles all the activity regarding
  the settings screen for contacts
**/
contacts.Settings = (function() {

  var orderCheckbox,
      orderByLastName,
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

  var initContainers = function initContainers() {
    orderCheckbox = document.querySelector('[name="order.lastname"]');
    orderCheckbox.addEventListener('change', onOrderingChange.bind(this));
  };

  // Listens for any change in the selection preferences
  var onOrderingChange = function onOrderingChange(evt) {
    newOrderByLastName = evt.target.checked;
    asyncStorage.setItem(ORDER_KEY, newOrderByLastName);
    updateOrderingUI();
  };

  // Dismiss settings window and execute operations if values got modified
  var close = function close() {
    if (newOrderByLastName != orderByLastName && contacts.List) {
      contacts.List.setOrderByLastName(newOrderByLastName);
      orderByLastName = newOrderByLastName;
    }

    Contacts.goBack();
  };
  
  return {
    'init': init,
    'close': close
  };
})();