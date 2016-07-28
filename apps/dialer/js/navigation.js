/* global AccessibilityHelper, CallLog */

(function(exports) {
  'use strict';

  var selectors = {
    recents: 'recents-panel',
    contacts: 'iframe-contacts-container',
    keypad: 'keypad-panel'
  };
  var currentDestination = null;

  /**
   * If the contacts tab iframe was launched via an activity to update a
   * contact make it go back to the base URL.
   *
   * XXX bug 1046090: this will go away as soon as the contacts app will be
   * split from the dialer.
   */
  function checkContactsTab() {
    var contactsIframe = document.getElementById('iframe-contacts');
    if (!contactsIframe) {
      return;
    }

    var index = contactsIframe.src.indexOf('#add-parameters');
    if (index != -1) {
      contactsIframe.src = contactsIframe.src.substr(0, index);
    }
  }

  /**
   * Update the current view by initializing the associated code. This also
   * highlights the navigation bar buttons appropriately.
   *
   * @param {String} destination The destination pane.
   */
  function update(destination) {
    var recent = document.getElementById('option-recents');
    var contacts = document.getElementById('option-contacts');
    var keypad = document.getElementById('option-keypad');
    var tabs = [recent, contacts, keypad];

    recent.classList.remove('toolbar-option-selected');
    contacts.classList.remove('toolbar-option-selected');
    keypad.classList.remove('toolbar-option-selected');

    switch (destination) {
      case 'recents':
        checkContactsTab();
        recent.classList.add('toolbar-option-selected');
        AccessibilityHelper.setAriaSelected(recent, tabs);
        CallLog.init();
        break;
      case 'contacts':
        var frame = document.getElementById('iframe-contacts');
        if (!frame) {
          var view = document.getElementById('iframe-contacts-container');
          frame = document.createElement('iframe');
          frame.src = '/contacts/index.html';
          frame.id = 'iframe-contacts';
          frame.setAttribute('frameBorder', 'no');
          frame.classList.add('grid-wrapper');

          view.appendChild(frame);
        }

        contacts.classList.add('toolbar-option-selected');
        AccessibilityHelper.setAriaSelected(contacts, tabs);

        var forceHashChange = new Date().getTime();
        // Go back to contacts home
        frame.src = '/contacts/index.html#home?forceHashChange=' +
                    forceHashChange;
        break;
      case 'keypad':
        checkContactsTab();
        keypad.classList.add('toolbar-option-selected');
        AccessibilityHelper.setAriaSelected(keypad, tabs);
        break;
    }
  }

  exports.Navigation =  {
    get currentView() {
      return currentDestination;
    },
    show: function(destination) {
      var selector = selectors[destination];
      if (!selector) {
        throw new Error(
          'Navigation: Invalid destination: ' + destination);
      }

      var view = document.getElementById(selector);
      if (!view) {
        throw new Error(
          'Navigation: Panel does not exist: ' + destination
        );
      }

      if (currentDestination && currentDestination === destination) {
        return;
      }
      // Update the status of the tab
      view.style.visibility = 'visible';
      // Remove the status of the previous one
      if (currentDestination) {
        var currentSelector = selectors[currentDestination];
        document.getElementById(currentSelector).style.visibility = 'hidden';
      }
      // Update the current view
      currentDestination = destination;
      update(destination);
    },
    showKeypad: function() {
      this.show('keypad');
    },
    showContacts: function() {
      this.show('contacts');
    },
    showCalllog: function() {
      this.show('recents');
    }
  };
}(window));
