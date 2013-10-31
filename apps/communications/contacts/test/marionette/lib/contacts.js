var assert = require('assert');

/**
 * Abstraction around contacts app.
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function Contacts(client) {
  this.client = client;
  this.client.setSearchTimeout(10000);
}

/**
 * @type String Origin of contacts app
 */
Contacts.URL = 'app://communications.gaiamobile.org';

Contacts.config = {
  settings: {
    // disable keyboard ftu because it blocks our display
    'keyboard.ftu.enabled': false
  }
};

Contacts.Selectors = {
  confirmHeader: '#confirmation-message h1',
  confirmBody: '#confirmation-message p',

  details: '#view-contact-details',
  detailsEditContact: '#edit-contact-button',
  detailsTelLabelFirst: '#phone-details-template-0 h2',

  form: '#view-contact-form',
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
  listContactFirst: '.contact-item',
  listContactFirstText: '.contact-item .contact-text',

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

  /**
   * Returns a localized string from a properties file.
   * @param {String} file to open.
   * @param {String} key of the string to lookup.
   */
  l10n: function(file, key) {
    var string = this.client.executeScript(function(file, key) {
      var xhr = new XMLHttpRequest();
      var data;
      xhr.open('GET', file, false); // Intentional sync
      xhr.onload = function(o) {
        data = xhr.response;
      };
      xhr.send(null);
      return data;
    }, [file, key]);

    var re = new RegExp(key + '\\s*=\\s*(.*)');
    var result = re.exec(string)[1];
    return result;
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

    client.helper.waitForElement(selectors.formSave).click();

    client.waitFor(function() {
      var location = client.findElement(selectors.form).location();
      return location.y >= 460;
    });

    client.helper.waitForElement(selectors.list);
  }
};

module.exports = Contacts;
