(function(exports) {
  'use strict';

  var selectors = {
    recents: 'recents-panel',
    contacts: 'iframe-contacts-container',
    keypad: 'keypad-panel'
  };
  var currentDestination= null;

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
