'use strict';

/* global Contacts */

/*
 *
 * This file is a shim that helps parent view navigate with child views.
 * It will be removed once haidification process will be finished. It
 * receives postMessage from navigation-shim-recever in child views and
 * it allows haidified views to use the same navigation module we used
 * before, without a single change.
 *
 */

var NavigationShim = {
  handleEvent: function(event) {
    if (event.type === 'message') {
      switch (event.data) {
        case 'back':
          Contacts.navigation.back();
          break;
        case 'home':
          Contacts.navigation.home();
          break;
        }
    }
  }
};

window.addEventListener('message', NavigationShim);
