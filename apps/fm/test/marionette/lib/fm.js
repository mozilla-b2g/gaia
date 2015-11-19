/* global require, module */
'use strict';

var assert = require('assert');

function Fm(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + Fm.DEFAULT_ORIGIN);
  this.actions = client.loader.getActions();
}

module.exports = Fm;

Fm.DEFAULT_ORIGIN = 'fm.gaiamobile.org';

Fm.Selector = Object.freeze({

  currentFrequency: '#frequency',
  dialerContainer:  '#dialer-container',

  seekDown:         '#frequency-op-seekdown',
  seekUp:           '#frequency-op-seekup',
  powerSwitch:      '#power-switch'
});

Fm.prototype = {

  client: null,


  get powerSwitch() {
    return this.client.findElement(Fm.Selector.powerSwitch);
  },

  // debug function.
  debugDocument: function() {
    var debug = this.client.executeScript(function() {
      return document.documentElement.innerHTML;
    });
    console.log('debug', debug);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  getCurrentFrequency: function() {
    var elem = this.client.findElement(Fm.Selector.currentFrequency);
    assert.ok(elem, 'Couldn\'t find frequency');

    // since I can't get the child text isolated...
    var freq = this.client.executeScript(function(sel) {
      return document.querySelector(sel).firstChild.textContent;
    }, [Fm.Selector.currentFrequency]);

    // for same reason these unicode delimiter are inserted
    // in the text node
    return freq.trim().replace(/[\u2068\u2069]/g, '');
  },

  getDialFreq: function() {
    var elem = this.client.findElement(Fm.Selector.dialerContainer);
    assert.ok(elem, 'Couldn\'t find dialer container');
    var dialFreq = elem.getAttribute('aria-valuenow');
    return dialFreq;
  },

  seekDown: function() {
    var elem = this.client.findElement(Fm.Selector.seekDown);
    assert.ok(elem, 'Seek Down button not found');
    elem.click();

    this.client.waitFor(function() {
      return !this.powerSwitch.getAttribute('data-seeking');
    }.bind(this));
  },

  seekUp: function() {
    var elem = this.client.findElement(Fm.Selector.seekUp);
    assert.ok(elem, 'Seek Down button not found');
    elem.click();

    this.client.waitFor(function() {
      return !this.powerSwitch.getAttribute('data-seeking');
    }.bind(this));
  },

  waitForLoaded: function() {
    this.client.waitFor(function() {
      return this.powerSwitch.getAttribute('data-enabled');
    }.bind(this));
  }
};
