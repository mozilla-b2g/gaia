'use strict';
/* global module */

/**
 * Abstraction around homescreen.
 * @constructor
 */
function Home2(client) {
  this.client = client;
}

Home2.clientOptions = {
  prefs: {
    'dom.inter-app-communication-api.enabled': true,
    'dom.w3c_touch_events.enabled': 1
  },
  settings: {
    'homescreen.manifestURL': 'app://home2.gaiamobile.org/manifest.webapp',
    'ftu.manifestURL': null,
    'keyboard.ftu.enabled': false,
    'lockscreen.enabled': false,
    'rocketbar.enabled': false
  }
};

/**
 * @type String Origin of Home2 app
 */
Home2.URL = 'app://home2.gaiamobile.org';

Home2.Selectors = {
  search: '#search',
  firstIcon: '#icons div.icon'
};

/**
 * Launches our new homescreen and focuses on it.
 */
Home2.prototype = {

  /**
   * Emulates pressing of the hardware home button.
   */
  pressHomeButton: function() {
    this.client.executeScript(function() {
      var home = new CustomEvent('home');
      window.dispatchEvent(home);
    });
  }
};

module.exports = Home2;
