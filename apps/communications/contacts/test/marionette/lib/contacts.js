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
  body: 'body',
  bodyReady: 'body .view-body',

  confirmHeader: '#confirmation-message h1',
  confirmBody: '#confirmation-message p',

  details: '#view-contact-details',
  detailsEditContact: '#edit-contact-button',
  detailsTelLabelFirst: '#phone-details-template-0 h2',
  detailsTelButtonFirst: 'button.icon-call[data-tel]',
  detailsFindDuplicate: '#contact-detail-inner #find-merge-button',

  duplicateFrame: 'iframe[src*="matching_contacts.html"]',
  duplicateHeader: '#title',
  duplicateClose: '#merge-close',
  duplicateMerge: '#merge-action',

  form: '#view-contact-form',
  formTitle: '#contact-form-title',
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
    this.client.helper.waitForElement(Contacts.Selectors.bodyReady);
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
        data = JSON.parse(xhr.response);
      };
      xhr.send(null);
      return data;
    }, [file, key]);

    return string[key]['_'];
  },

  waitSlideLeft: function(elementKey) {
    var element = this.client.findElement(Contacts.Selectors[elementKey]),
        location;
    var test = function() {
      location = element.location();
      return location.x <= 0;
    };
    this.client.waitFor(test);
  },

  waitForSlideDown: function(element) {
    var bodyHeight = this.client.findElement(Contacts.Selectors.body).
      size().height;
    var test = function() {
      return element.location().y >= bodyHeight;
    };
    this.client.waitFor(test);
  },

  waitForSlideUp: function(element) {
    var test = function() {
      return element.location().y <= 0;
    };
    this.client.waitFor(test);
  },

  waitForFormShown: function() {
    var form = this.client.helper.waitForElement(Contacts.Selectors.form),
        location;
    var test = function() {
      location = form.location();
      return location.y <= 0;
    };
    this.client.waitFor(test);
  },

  waitForFormTransition: function() {
    var selectors = Contacts.Selectors,
        bodyHeight = this.client.findElement(selectors.body).size().height,
        form = this.client.findElement(selectors.form);
    var test = function() {
      var location = form.location();
      return location.y >= bodyHeight;
    };
    this.client.waitFor(test);
  },

  enterContactDetails: function(details) {

    var selectors = Contacts.Selectors;

    details = details || {
      givenName: 'Hello',
      familyName: 'Contact'
    };

    this.waitForFormShown();

    for (var i in details) {
      // Camelcase details to match form.* selectors.
      var key = 'form' + i.charAt(0).toUpperCase() + i.slice(1);

      this.client.findElement(selectors[key])
        .sendKeys(details[i]);
    }

    this.client.findElement(selectors.formSave).click();

    this.waitForFormTransition();
  },

  addContact: function(details) {
    var selectors = Contacts.Selectors;

    var addContact = this.client.findElement(selectors.formNew);
    addContact.click();

    this.enterContactDetails(details);

    this.client.helper.waitForElement(selectors.list);
  },

  /**
   * Helper method to simulate clicks on iFrames which is not currently
   *  working in the Marionette JS Runner.
   * @param {Marionette.Element} element The element to simulate the click on.
   **/
  clickOn: function(element) {
    element.scriptWith(function(elementEl) {
      var event = new MouseEvent('click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
      });
      elementEl.dispatchEvent(event);
    });
  }
};

module.exports = Contacts;
