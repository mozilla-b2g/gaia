'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Settings', function() {
  var client = marionette.client({ profile: Contacts.config });
  var subject;
  var selectors;
  var buttonSelectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
    buttonSelectors = [selectors.exportButton, selectors.bulkDelete,
                       selectors.setIceButton];
  });

  function isDisabled(selector) {
    return client.executeScript(function(selector) {
      return document.querySelector(selector).disabled;
    }, [selector]);
  }

  suite('Export, delete and ice buttons disabled', function() {
    test('No contacts -> Disabled', function() {
      client.findElement(selectors.settingsButton).click();
      var settings = client.helper.waitForElement(selectors.settingsView);
      subject.waitForSlideUp(settings);
      buttonSelectors.forEach(function(selector) {
        assert.ok(isDisabled(selector));
      });
    });

    test('List not empty -> Active', function() {
      subject.addContact({
        givenName: 'Cristian'
      });

      client.helper.waitForElement(selectors.settingsButton).click();
      var settings = client.helper.waitForElement(selectors.settingsView);
      subject.waitForSlideUp(settings);
      buttonSelectors.forEach(function(selector) {
        assert.ok(!isDisabled(selector));
      });
    });
  });
});
