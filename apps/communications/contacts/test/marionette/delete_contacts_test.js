'use strict';

var Contacts = require('./lib/contacts');

marionette('Contacts > Delete', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

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

    // Enter in search mode
    client.helper.waitForElement(selectors.searchLabel).click();

    // Check that edit menu goes down
    var editMenu = client.helper.waitForElement(selectors.editMenu);
    subject.waitForSlideDown(editMenu);
  });
});
