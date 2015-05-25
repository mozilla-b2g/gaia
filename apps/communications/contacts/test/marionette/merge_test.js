'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Merge contacts', function() {
  var client = marionette.client({ profile: Contacts.config });
  var subject;
  var selectors;

  var aTelNumber = '655555555';
  var anotherTelNumber = '655555556';

  function addTestContact(name, telephone) {
    subject.addContact({
      givenName: name,
      tel: telephone
    });
  }

  function mergeContact(name, telephone) {
    subject.mergeContact({
      givenName: name,
      tel: telephone
    });
  }

  function selectAll(callback) {
    // Click on settings button and wait for slide up animation
    client.helper.waitForElement(selectors.settingsButton).click();
    var settings = client.helper.waitForElement(selectors.settingsView);
    subject.waitForSlideUp(settings);

    // Click on delete button and wait for slide down animation
    client.helper.waitForElement(selectors.bulkDelete).click();
    subject.waitForSlideDown(settings);

    var editForm = client.findElement(selectors.editForm);
    editForm.displayed(callback);
  }

  function checkHeaderCount(expectedCount) {
    client.helper.waitForElement(selectors.selectAllButton).click();

    var header = client.helper.waitForElement(selectors.header);
    return assert.equal(header.getAttribute('data-l10n-args'),
                        '{"n":' + expectedCount + '}');
  }

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

  test('Selection count should be correct after merging contacts', function() {
    addTestContact('Contact1', aTelNumber);
    addTestContact('Contact2', anotherTelNumber);
    mergeContact('Contact3', anotherTelNumber);
    selectAll(function() {
      checkHeaderCount(2);
    });
  });
});
