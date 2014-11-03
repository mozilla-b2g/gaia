'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');
var Actions = require('marionette-client').Actions;

marionette('Contacts > Search', function() {
  var client = marionette.client(Contacts.config);
  var actions = new Actions(client);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  suite('Search Mode', function() {
    test('Can enter and exit search mode', function() {
      subject.addContact();

      client.helper.waitForElement(selectors.searchLabel).click();
      var result = client.helper.waitForElement(selectors.searchResultFirst);
      assert.ok(result.displayed(), 'Search view was not opened');

      client.helper.waitForElement(selectors.searchCancel).click();
      var listView = client.helper.waitForElement(selectors.list);
      assert.ok(listView.displayed(), 'List view was not shown');
    });

    test('Search text is displayed correctly', function() {
      var details = details || {
        givenName: 'A%%&'
      };

      subject.addContact(details);
      client.helper.waitForElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchInput).sendKeys('a');
      client.helper.waitForElement(selectors.searchResultFirst).text(
        function(error, textContent) {
          assert.equal('A%%&', textContent);
      });
    });

    test('Search gets updated if contact changes', function() {
      subject.addContact();
      client.helper.waitForElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchResultFirst).click();
      client.helper.waitForElement(selectors.detailsEditContact).click();
      subject.waitForFormShown();
      client.helper.waitForElement(selectors.formGivenName).sendKeys('zzz');
      client.findElement(selectors.formSave).click();

      var header = client.helper.waitForElement(selectors.detailsHeader);
      actions.wait(0.5).tap(header, 10, 10).perform();

      client.helper.waitForElement(selectors.searchResultFirst).text(
        function(error, textContent) {
          assert.ok(textContent.indexOf('zzz') >= 0);
      });
    });
  });
});
