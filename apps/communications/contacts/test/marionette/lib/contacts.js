var assert = require('assert');

/**
 * Abstraction around contacts app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Contacts(client) {
  this.client = client;
}

/**
 * @type String Origin of contacts app
 */
Contacts.URL = 'app://communications.gaiamobile.org';

Contacts.Selectors = {
  confirmHeader: '#confirmation-message h1',
  confirmBody: '#confirmation-message p',

  details: '#view-contact-details',
  detailsEditContact: '#edit-contact-button',
  detailsTelLabelFirst: '#phone-details-template-0 h2',

  formCustomTag: '#custom-tag',
  formCustomTagPage: '#view-select-tag',
  formCustomTagDone: '#view-select-tag #settings-done',
  formNew: '#add-contact-button',
  formGivenName: '#givenName',
  formFamilyName: '#familyName',
  formSave: '#save-button',
  formTel: '#contacts-form-phones input[type="tel"]',
  formTelLabelFirst: '#tel_type_0',

  list: '#view-contacts-list',
  listContactFirst: '.contact-item .contact-text',

  searchLabel: '#search-start',
  searchInput: '#search-contact',
  searchCancel: '#cancel-search',
  searchResultFirst: '#search-list .contact-item'
};

/**
 * @private
 * @param {Marionette.Client} client for selector.
 * @param {String} name of selector [its a key in Contacts.Selectors].
 */
function findElement(client, name) {
  return client.findElement(Contacts.Selectors[name]);
}

Contacts.prototype = {
  /**
   * Launches contacts app and focuses on frame.
   */
  launch: function() {
    this.client.apps.launch(Contacts.URL, 'contacts');
    this.client.apps.switchToApp(Contacts.URL, 'contacts');
    this.client.helper.waitForElement('body .view-body');
  },

  relaunch: function() {
    this.client.apps.close(Contacts.URL, 'contacts');
    this.launch();
  },

  addContact: function(details) {

    details = details || {
      givenName: 'Hello',
      familyName: 'Contact'
    };

    var selectors = Contacts.Selectors;

    var addContact = client.findElement(selectors.formNew);
    addContact.click();

    client.helper.waitForElement(selectors.formGivenName);

    for (var i in details) {
      // Camelcase details to match form.* selectors.
      var key = 'form' + i.charAt(0).toUpperCase() + i.slice(1);

      client.findElement(selectors[key])
        .sendKeys(details[i]);
    }

    client.findElement(selectors.formSave).click();

    client.helper.waitForElement(selectors.list);
  }
};

module.exports = Contacts;
