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
  powerSwitch:      '#power-switch',
  favButton:        '#bookmark-button',
  favList:          '#fav-list',
  favListContainer: '#fav-list-container',
  favItemSelected:  '.fav-list-item.selected',
  favItemSelectedFreq:'.fav-list-item.selected .fav-list-frequency',
  favItem:          '.fav-list-item',
});

Fm.prototype = {

  client: null,


  get powerSwitch() {
    return this.client.findElement(Fm.Selector.powerSwitch);
  },

  get favButton() {
    return this.client.findElement(Fm.Selector.favButton);
  },

  get favListContainer() {
    return this.client.findElement(Fm.Selector.favListContainer);
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

  // since we can't get the child text isolated with marionette.
  // You might want to call _trimFreqTextContent() on the result.
  _getTextNodeContent: function(sel) {
    return this.client.executeScript(function(sel) {
      return document.querySelector(sel).firstChild.textContent;
    }, [sel]);
  },

  // make sure we have just the frequency
  _trimFreqTextContent: function(freq) {
    // for some reason these unicode delimiters are inserted
    // in the text node
    return freq.trim().replace(/[\u2068\u2069]/g, '');
  },

  getCurrentFrequency: function() {
    var elem = this.client.findElement(Fm.Selector.currentFrequency);
    assert.ok(elem, 'Couldn\'t find frequency');

    var freq = this._getTextNodeContent(Fm.Selector.currentFrequency);
    return this._trimFreqTextContent(freq);
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

  fav: function() {
    var elem = this.favButton;
    elem.tap();
  },

  selectedFavItem: function() {
    return this.favListContainer.findElement(Fm.Selector.favItemSelected);
  },

  selectedFavItemText: function() {
    var freq = this._getTextNodeContent(Fm.Selector.favItemSelectedFreq);
    return this._trimFreqTextContent(freq);
  },

  isFav: function() {
    return this.favButton.getAttribute('data-bookmarked') == 'true';
  },

  waitForLoaded: function() {
    this.client.waitFor(function() {
      return this.powerSwitch.getAttribute('data-enabled');
    }.bind(this));
  }
};
