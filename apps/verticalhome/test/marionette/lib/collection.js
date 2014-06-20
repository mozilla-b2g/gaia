'use strict';
/* global module */

var Actions = require('marionette-client').Actions;

function Collection(client, server) {
  this.client = client;
  this.server = server;
  this.actions = new Actions(client);
}

/**
 * @type String Origin of Collection app
 */
Collection.URL = 'app://collection.gaiamobile.org';

Collection.Selectors = {
  cloudMenu: '#cloud-menu',
  cloudMenuPin: '#pin-cloudapp',
  contextMenuTarget: '#icons',
  menuAddButton: '#create-smart-collection',
  collectionsSelect: '#collections-select',

  // The first pinned result
  firstPinnedResult: 'gaia-grid .icon',

  // The first web result when NO pinned items exist
  firstWebResultNoPinned: 'gaia-grid .icon',

  // The first web result when pinned items exist
  firstWebResultPinned: 'gaia-grid .divider + .icon',

  allDividers: 'gaia-grid .divider',
  allIcons: 'gaia-grid .icon'
};

Collection.prototype = {

  /**
   * Enters the create collection screen from the homescreen.
   */
  enterCreateScreen: function() {
    var selectors = Collection.Selectors;
    var container = this.client.helper.waitForElement(
      selectors.contextMenuTarget);
    this.actions.longPress(container, 1).perform();

    this.client.helper.waitForElement(selectors.menuAddButton).click();
  },

  /**
   * Selects a collection by positions in the list.
   * @return {Array} An array of item names.
   */
  selectNew: function(names) {
    if (!Array.isArray(names)) {
      names = [names];
    }

    this.client.switchToFrame();
    this.client.apps.switchToApp(Collection.URL);

    var selectors = Collection.Selectors;
    var select = this.client.helper.waitForElement(
      selectors.collectionsSelect);

    // XXX: System dialog does not appear for select boxes for some reason in
    // activites. For now we simply manually select everything and fire a blur
    // event which the code looks for to submit the form. There is no UI in the
    // test because of this, but everything seems to work.
    for (var i = 0, iLen = names.length; i < iLen; i++) {
      var name = names[i];
      this.client.helper.tapSelectOption(select, name);
    }

    select.scriptWith(function(el) {
      el.dispatchEvent(new CustomEvent('blur'));
    });
    this.client.switchToFrame();
  },

  /**
   * Verifies that a collection exists by name.
   * @return {Element} The collection icon.
   */
  getCollectionByName: function(name) {
    var icon;
    this.client.waitFor(function() {
      try {
        var icons = this.client.findElements('body .icon');
        for (var i = 0, iLen = icons.length; i < iLen; i++) {
          if (icons[i].text() === name) {
            icon = icons[i];
            return true;
          }
        }
      } catch(e) {
        return false;
      }
    }.bind(this));
    return icon;
  },

  /**
   * Gets an icon by identifier.
   */
  getIconByIdentifier: function(identifier) {
    return this.client.helper.waitForElement(
      '[data-identifier="' + identifier + '"]'
    );
  },

  /**
   * Taps on a collection and waits for it to load.
   * @param {Object} icon The collection icon on the homescreen.
   */
  enterCollection: function(icon) {
    icon.tap();

    this.client.switchToFrame();
    this.client.apps.switchToApp(Collection.URL);

    this.client.helper.waitForElement(
      Collection.Selectors.firstWebResultNoPinned);
  },

  /**
   * Pins a result to the top of the collection.
   * @param {String} selector The selector to find the icon in web results.
   */
  pin: function(selector) {
    var selectors = Collection.Selectors;
    var firstIcon = this.client.helper.waitForElement(selector);
    this.actions.longPress(firstIcon, 1).perform();
    this.client.helper.waitForElement(selectors.cloudMenuPin).click();
  }
};

module.exports = Collection;
