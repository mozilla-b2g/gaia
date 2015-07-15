'use strict';

var Contacts = require('./lib/contacts');

marionette('Contacts > Delete', function() {
  var client = marionette.client({ profile: Contacts.config });
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

  // Disabling these tests by now due to we need a way to switch between
  // different locations within the app (Form & Setting will be no longer
  // in the same document).
  // More info in [1].
  // These test must be recovered once this bug will be landed.

  // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9
  test.skip(' > Edit menu is not visible on search mode', function() {
    subject.addContact({
      givenName: 'Hello',
      tel: 1231231234
    });

    // Click on settings button and wait for slide up animation
    client.helper.waitForElement(selectors.settingsButton).click();
    var settings = client.helper.waitForElement(selectors.settingsView);
    subject.waitForSlideUp(settings);

    // Click on delete button and wait for slide down animation
    client.helper.waitForElement(selectors.bulkDelete).click();
    subject.waitForSlideDown(settings);

    var editForm = client.findElement(selectors.editForm);
    editForm.displayed(function onDisplayed() {
      // Enter in search mode
      client.helper.waitForElement(selectors.searchLabel).click();

      // Wait until the select-all view goes away
      client.helper.waitForElementToDisappear(selectors.editMenu);
    });
  });
});
