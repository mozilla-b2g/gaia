'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Import from SDCARD', function() {
  var profile = Contacts.config;
  // Enable device storage
  var prefs = ['device.storage.enabled',
        'device.storage.testing',
        'device.storage.prompt.testing'];
  prefs.forEach(pref => {
    profile[pref] = true;
  });
  var client = marionette.client({
    profile: profile,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var contactsApp, selectors;

  setup(function() {
    client.fileManager.removeAllFiles();
    client.fileManager.add({
      type: 'text',
      filePath: 'apps/communications/contacts/test/marionette/data/vcard_4.vcf'
    });

    contactsApp = new Contacts(client);
    contactsApp.launch();
    selectors = Contacts.Selectors;
  });

  test('> one contact in one file', function() {
    // Go to settings
    client.helper.waitForElement(selectors.settingsButton).tap();

    // Now click on import contacts button
    client.helper.waitForElement(selectors.importContacts).tap();
    client.helper.waitForElement(selectors.importSDCard).tap();

    // Get back to the list
    client.switchToShadowRoot(client.helper
      .waitForElement(selectors.importHeader));
    contactsApp.clickOn(client.helper.waitForElement(selectors.actionButton));
    client.switchToShadowRoot();
    contactsApp.waitForFadeIn(client.helper
      .waitForElement(selectors.settingsView));
    client.helper.waitForElement(selectors.settingsClose).tap();
    contactsApp.waitForFadeIn(client.helper.waitForElement(selectors.list));

    // Check that we have 1 contact and is the one from the SD,
    var firstContact = client.findElement(selectors.listContactFirstText);
    assert.equal(firstContact.text(), 'Forrest Gump');
  });
});