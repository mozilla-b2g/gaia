'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');
var fs = require('fs');

marionette('Export to SDCARD', function() {
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
  var actions, subject, selectors;

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();

    subject = new Contacts(client);
    actions = client.loader.getActions();
    subject.actions = actions;
    subject.launch();
    selectors = Contacts.Selectors;
  });

  test('> export one contact', function() {
    // Create a contact first
    subject.addContact({
      givenName: 'John',
      tel: 1231231234
    });

    // Go to settings
    client.helper.waitForElement(selectors.settingsButton).click();

    // Now click on import contacts button
    client.helper.waitForElement(selectors.exportButton).click();
    client.helper.waitForElement(selectors.exportSDCard).click();

    // Select all and export
    client.helper.waitForElement(selectors.selectAllButton).click();
    client.helper.waitForElement(selectors.selectAction).click();

    // Check the string on the status
    var status = client.helper.waitForElement(selectors.multipleSelectStatus);
    assert.equal('1/1 contacts exported', status.text());

    // Check we have a file in the sdcard
    var path = client.fileManager.deviceStorage.getDeviceStoragePath();
    console.log('path is ' + path);
    assert.ok(fs.existsSync(path));

    var files = fs.readdirSync(path);
    assert.equal(files.length, 1);

    subject.waitForFadeIn(client.helper.waitForElement(selectors.list));
  });
});