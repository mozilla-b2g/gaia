'use strict';

/* exported MockNavigation */

var MockNavigation = {
  _currentView: null,
  get currentView() {
    return this._currentView;
  },
  show: function(destination) {
    this._currentView = destination;
  },
  showKeypad: function() {
    this.show('keypad');
  },
  showCalllog: function() {
    this.show('recents');
  },
  showContacts: function() {
    this.show('contacts');
  }
};

