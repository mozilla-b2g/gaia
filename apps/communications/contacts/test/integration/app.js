'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function ContactsIntegration(device) {
  AppIntegration.apply(this, arguments);
}

ContactsIntegration.prototype = {
  __proto__: AppIntegration.prototype,

  appName: 'Contacts',
  manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
  entryPoint: 'contacts',

  /** selector tables */
  selectors: {
    /** views */
    contactsList: '#view-contacts-list',
    contactsForm: '#view-contact-form',
    contactDetails: '#view-contact-details',
    tagsView: '#view-select-tag',

    /** buttons */
    addButton: '#add-contact-button',
    doneButton: '#save-button',
    editButton: '#edit-contact-button',
    deleteButton: '#delete-contact',
    confirmButton: '#dialog-yes',
    backButton: '#details-back',
    addNewEmailButton: '#add-new-email',
    addNewCommentButton: '#add-new-note',
    tagsBack: '#settings-cancel',
    tagDone: '#settings-done',
    favoriteButton: '#toggle-favorite',

    /** forms **/
    form: '#contact-form',

    /** other sections **/
    noContacts: '#no-contacts',
    lList: '#contacts-list-L',
    dialogScreen: '#confirmation-message',
    detailsList: '#details-list',
    mirrorDetails: '#mirror-contact-details',

    /** Details **/
    name: '#contact-name-title',
    org: '#org-title',
    favoriteStar: '#favorite-star'

  },

  waitForElementTextToEqual: function(element, expectedText, callback) {
    this.task(function(app, next, done) {
      var text = yield element.text(next);

      var isEqual = text === expectedText;
      done(null, isEqual);
    }, callback);
  },

  waitForElementsLengthEqual: function(element, selector, expectedNum, callback) {
    this.task(function(app, next, done) {
      var elements = yield element.findElements(selector);

      var isEqual = (elements.length === expectedNum);
      done(null, isEqual);
    }, callback);
  },

  observeRendering: function() {
    var self = this;

    this.task(function (app, next, done) {
      yield IntegrationHelper.importScript(
        app.device,
        'apps/communications/contacts/test/atoms/contacts_rendering_performance.js',
        next
      );

      yield app.device.executeAsyncScript(
        'window.wrappedJSObject.ContactsRenderingPerformance.register();'
      );

      var results = yield app.device.executeAsyncScript(
        'window.wrappedJSObject.ContactsRenderingPerformance.waitForResults();'
      );

      yield app.device.executeAsyncScript(
        'window.wrappedJSObject.ContactsRenderingPerformance.unregister();'
      );

      done(null, results);
    });
  }
};
