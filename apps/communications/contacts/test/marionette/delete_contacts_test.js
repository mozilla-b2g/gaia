'use strict';

var assert = require('assert');

var Contacts = require('./lib/contacts');

marionette('Contacts > Delete', function() {
  var client = marionette.client({
    profile: Contacts.config,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

  function goToSelectMode() {
    // Click on settings button and wait for slide up animation
    client.helper.waitForElement(selectors.settingsButton).click();
    var settings = client.helper.waitForElement(selectors.settingsView);
    subject.waitForSlideUp(settings);

    // Click on delete button and wait for slide down animation
    client.helper.waitForElement(selectors.bulkDelete).click();
    subject.waitForSlideDown(settings);
  }

  function isDisabled(selector) {
    return client.executeScript(function(selector) {
      return document.querySelector(selector).disabled;
    }, [selector]);
  }

  test(' > Edit menu is not visible on search mode', function() {
    subject.addContact({
      givenName: 'Hello',
      tel: 1231231234
    });

    goToSelectMode();

    var editForm = client.findElement(selectors.editForm);
    editForm.displayed(function onDisplayed() {
      // Enter in search mode
      client.helper.waitForElement(selectors.searchLabel).click();

      // Wait until the select-all view goes away
      client.helper.waitForElementToDisappear(selectors.editMenu);
    });
  });

  // Moztrap: https://moztrap.mozilla.org/manage/case/15181/
  test(' > All contacts', function() {
    subject.addContact({
      givenName: 'Contact 1'
    });
    subject.addContact({
      givenName: 'Contact 2'
    });

    goToSelectMode();
    // Check that the action now is not available
    assert.ok(isDisabled(selectors.selectAction));
    // Click in select all
    client.helper.waitForElement(selectors.selectAllButton).click();
    // Click on delete
    client.helper.waitForElement(selectors.selectAction).click();
    // Click on the confirmation
    client.helper.waitForElement(selectors.confirmDelete).click();
    // Wait until the list appear and check it's empty
    client.helper.waitForElement(selectors.noContacts);

    // Wait for the status saying we removed contacts
    var status = client.helper.waitForElement(selectors.multipleSelectStatus);
    subject.waitForSlideDown(status);

    client.executeScript(function() {
      return !document.querySelector('#no-contacts').classList.contains('hide');
    });
  });

});
