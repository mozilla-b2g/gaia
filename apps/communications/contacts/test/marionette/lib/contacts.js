'use strict';

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
  prefs: {
    'device.storage.enabled': true,
    'device.storage.testing': true,
    'device.storage.prompt.testing': true
  }
};

Contacts.Selectors = {
  body: 'body',
  bodyReady: 'body .view-body',

  settingsButton: '#settings-button',

  confirmHeader: '#confirmation-message h1',
  confirmBody: '#confirmation-message p',
  confirmDismiss: '#confirmation-message menu button',

  details: '#view-contact-details',
  detailsEditContact: '#edit-contact-button',
  detailsTelLabelFirst: '#phone-details-template-0 h2',
  detailsTelButtonFirst: '.button.icon-call[data-tel]',
  detailsEmail: '#contact-detail-inner #email-details-template-0 div.item',
  detailsAddress: '#contact-detail-inner #address-details-template-0 div.item',
  detailsOrg: '#contact-detail-inner #org-title',
  detailsNote: '#contact-detail-inner #note-details-template-0',
  detailsFindDuplicate: '#contact-detail-inner #find-merge-button',
  detailsFavoriteButton: '#toggle-favorite',
  detailsContactName: '#contact-name-title',
  detailsHeader: '#details-view-header',
  detailsSocialLabel: '#contact-detail-inner #details-list #social-label',
  detailsSocialTemplate: '#contact-detail-inner #details-list .social-actions',
  detailsCoverImage: '#cover-img',
  detailsLinkButton: '#contact-detail-inner #link_button',
  detailsShareButton: '#contact-detail-inner #share_button',
  fbMsgButton: '#contact-detail-inner #msg_button',
  fbWallButton: '#contact-detail-inner #wall_button',
  fbProfileButton: '#contact-detail-inner #profile_button',

  findDupsButton: '#details-list #find-merge-button',

  duplicateFrame: 'iframe[src*="matching_contacts.html"]',
  duplicateHeader: '#title',
  duplicateClose: '#merge-close',
  duplicateMerge: '#merge-action',

  exportButton: '#exportContacts button',

  form: '#view-contact-form',
  formTitle: '#contact-form-title',
  formCustomTag: '#custom-tag',
  formCustomTagPage: '#view-select-tag',
  formCustomTagDone: '#view-select-tag #settings-done',
  formNew: '#add-contact-button',
  formGivenName: '#givenName',
  formOrg: '#org',
  formFamilyName: '#familyName',
  formSave: '#save-button',
  formTel: '#contacts-form-phones input[type="tel"]',
  formDelFirstTel: '#add-phone-0 .img-delete-button',
  formTelLabelFirst: '#tel_type_0',
  formTelNumberFirst: '#number_0',
  formTelNumberSecond: '#number_1',
  formEmailFirst: '#email_0',
  formEmailSecond: '#email_1',
  formPhotoButton: '#photo-button',
  formAddNewTel: '#add-new-phone',
  formAddNewEmail: '#add-new-email',
  formHeader: '#contact-form-header',
  formPhotoImg: '#thumbnail-photo',

  groupList: ' #groups-list',
  list: '#view-contacts-list',
  listContactFirst: 'li:not([data-group="ice"]).contact-item',
  listContactFirstText: 'li:not([data-group="ice"]).contact-item p',
  contactListHeader: '#contacts-list-header',

  searchLabel: '#search-start',
  searchInput: '#search-contact',
  searchCancel: '#cancel-search',
  searchResultFirst: '#search-list .contact-item',

  scrollbar: 'nav[data-type="scrollbar"]',
  overlay: 'nav[data-type="scrollbar"] p',

  settingsView: '#view-settings',
  settingsClose: '#settings-close',
  bulkDelete: '#bulkDelete',

  editForm: '#selectable-form',
  editMenu: '#select-all-wrapper',
  selectAllButton: '#select-all',

  clearOrgButton: '#clear-org',
  setIceButton: '#set-ice',
  iceHeader: '#ice-header',
  iceSettingsHeader: '#ice-settings-header',
  iceSettings: '#ice-settings',
  iceSwitch1: '#ice-contacts-1-switch',
  iceInputSwitch1: '#ice-contacts-1-switch input[type="checkbox"]',
  iceSwitch2: '#ice-contacts-2-switch',
  iceInputSwitch2: '#ice-contacts-2-switch input[type="checkbox"]',
  iceButton1: '#select-ice-contact-1',
  iceButton2: '#select-ice-contact-2',
  iceGroupOpen: '#section-group-ice',
  iceContact: '#ice-group .contact-item',

  activityChooser: 'form[data-type="action"]',
  buttonActivityChooser: 'form[data-type="action"] button',
  actionMenu: '#action-menu',
  actionMenuList: '#value-menu',

  multipleSelectSave: '#save-button',
  multipleSelectStatus: '#statusMsg p',

  systemMenu: 'form[data-z-index-level="action-menu"]',

  galleryImage: '.thumbnail img',
  galleryDone: '#crop-done-button',

  header: '#edit-title'
};

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
    var ast = this.client.executeScript(function(file, key) {
      var xhr = new XMLHttpRequest();
      var data;
      xhr.open('GET', file, false); // Intentional sync
      xhr.onload = function(o) {
        data = JSON.parse(xhr.response);
      };
      xhr.send(null);
      return data;
    }, [file, key]);

    for (var i = 0; i < ast.length; i++) {
      if (ast[i].$i === key) {
        return ast[i].$v;
      }
    }
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

  waitForFadeIn: function(element) {
    var test = function() {
      var opacity = element.cssProperty('opacity');
      var pointerEvents = element.cssProperty('pointer-events');

      return opacity == 1 && pointerEvents == 'auto';
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
        form = this.client.findElement(selectors.form);
    this.client.helper.waitForElementToDisappear(form);
  },

  editContact: function() {
    var selectors = Contacts.Selectors;

    var edit = this.client.helper.waitForElement(selectors.detailsEditContact);
    this.clickOn(edit);
    this.waitForFadeIn(this.client.helper.waitForElement(selectors.form));
  },

  // Goes back to the Contact List view from a Details view
  backToList: function() {
    var selectors = Contacts.Selectors;

    // Now we go back to the ICE settings and check that our ICE remains
    this.waitForFadeIn(this.client.helper.waitForElement(selectors.details));
    var header = this.client.helper.waitForElement(selectors.detailsHeader);
    this.actions.wait(0.5).tap(header, 10, 10).perform();
    this.waitSlideLeft('list');
  },

  enterContactDetails: function(details) {

    var selectors = Contacts.Selectors;

    details = details || {
      givenName: 'Hello',
      familyName: 'Contact',
      org: 'Enterprise'
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

  mergeContact: function(details) {
    var selectors = Contacts.Selectors;

    var addContact = this.client.findElement(selectors.formNew);
    addContact.click();

    this.enterContactDetails(details);

    var duplicateFrame = this.client.findElement(selectors.duplicateFrame);
    this.waitForSlideUp(duplicateFrame);
    this.client.switchToFrame(duplicateFrame);

    var mergeAction =
      this.client.helper.waitForElement(selectors.duplicateMerge);
    this.clickOn(mergeAction);

    this.client.switchToFrame();
    this.client.apps.switchToApp(Contacts.URL, 'contacts');
    this.waitForSlideDown(duplicateFrame);
  },

  addContactMultipleEmails: function(details) {
    var selectors = Contacts.Selectors;

    var addContact = this.client.findElement(selectors.formNew);
    addContact.click();
    this.client.helper.waitForElement(selectors.formAddNewEmail).click();

    this.enterContactDetails(details);

    this.client.helper.waitForElement(selectors.list);
  },

  get systemMenu() {
    var selectors = Contacts.Selectors;
    // Switch to the system app first.
    this.client.switchToFrame();
    return this.client.helper.waitForElement(selectors.systemMenu);
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
  },

  getElementStyle: function(selector, type) {
    return this.client.executeScript(function(selector, type) {
      return document.querySelector(selector).style[type];
    }, [selector, type]);
  }
};

module.exports = Contacts;
