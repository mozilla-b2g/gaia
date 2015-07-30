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

  // Disabling these tests by now due to we need a way to switch to a
  // different window instead of switching to an app, due to paths can
  // differ.
  // More info in [1].
  // These test must be recovered once this bug will be landed.

  // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9
  test.skip(
    'Selection count should be correct after merging contacts',
    function() {
      addTestContact('Contact1', aTelNumber);
      addTestContact('Contact2', anotherTelNumber);
      mergeContact('Contact3', anotherTelNumber);
      selectAll(function() {
        checkHeaderCount(2);
      });
    }
  );
});
