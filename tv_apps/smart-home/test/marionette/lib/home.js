'use strict';
/* global module */

var system, actions;

function Home(client) {
  this.client = client;
  system = client.loader.getAppClass('system');
  actions = client.loader.getActions();
}

/**
 * @type String Origin of search app
 */
Home.URL = 'app://smart-home.gaiamobile.org';

Home.Selectors = {
  fte: '#fte',
  ftePages: '#fte > section',
  cards: '#card-list > .card'
};

Home.prototype = {

  URL: Home.URL,
  PATH: Home.URL + '/index.html',
  Selectors: Home.Selectors,
  frame: null,

  get fte() {
    return this.client.findElement(this.Selectors.fte);
  },

  get ftePages() {
    return this.client.findElements(this.Selectors.ftePages);
  },

  get cards() {
    return this.client.findElements(this.Selectors.cards);
  },

  existCardWithName: function(name) {
    var cards = this.cards;
    for (var i = cards.length - 1; i >= 0; i--) {
      var nameSpan = cards[i].findElement('span.name');
      var text = nameSpan.scriptWith(function(el) {
        return el.textContent;
      });
      if (text === name) {
        return true;
      }
    }
    return false;
  },

  switchFrame: function() {
    this.client.switchToFrame();
    this.frame = system.getAppIframeByOrigin(this.URL);
    this.client.switchToFrame(this.frame);
  },

  skipFte: function() {
    var pages = this.ftePages;
    for (var i = 0; i < pages.length; i++) {
      var button = pages[i].findElement('smart-button');
      this.client.helper.waitForElement(button);
      system.sendKeyToElement(button, 'enter');
    }
    this.client.helper.waitForElementToDisappear(this.Selectors.fte);
  }
};

module.exports = Home;
