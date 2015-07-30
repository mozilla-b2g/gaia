'use strict';

var Contacts = require('./lib/contacts');
var ContactsData = require('./lib/contacts_data');
var assert = require('assert');

marionette('Contacts > Search', function() {
  var client = marionette.client({ profile: Contacts.config });
  var contactsData = new ContactsData(client);
  var subject;
  var selectors;
  var testContact;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    testContact = {
      tel: [{value: '1231231234', type: ['home']}],
      givenName: ['Hello'],
      familyName: ['World'],
      name: ['Hello World'],
      email: [{value: 'hello@example.com', type: ['home']}],
      adr: [{type: ['home'], pref: true, streetAddress: 'False Street 123'}],
      org: ['Mozilla'],
      note: ['This is a note about the contact.']
    };

    selectors = Contacts.Selectors;
  });

  suite('Search Mode', function() {
    test('Can enter and exit search mode', function() {
      contactsData.createMozContact(testContact);

      client.helper.waitForElement(selectors.searchLabel).click();
      var result = client.helper.waitForElement(selectors.searchResultFirst);
      assert.ok(result.displayed(), 'Search view was not opened');

      client.helper.waitForElement(selectors.searchCancel).click();
      var listView = client.helper.waitForElement(selectors.list);
      assert.ok(listView.displayed(), 'List view was not shown');
    });

    test('Search text is displayed correctly', function() {
      var details = details || {
        givenName: ['A%%&']
      };

      contactsData.createMozContact(details);
      client.helper.waitForElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchInput).sendKeys('a');
      client.helper.waitForElement(selectors.searchResultFirst).text(
        function(error, textContent) {
          assert.equal('A%%&', textContent);
      });
    });

    test('Search gets updated if contact changes', function() {
      contactsData.createMozContact(testContact);
      client.helper.waitForElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchResultFirst).click();
      client.helper.waitForElement(selectors.detailsEditContact).click();
      subject.waitForFormShown();
      client.helper.waitForElement(selectors.formGivenName).sendKeys('zzz');
      client.findElement(selectors.formSave).click();
      client.helper.waitForElement(selectors.detailsContactName).text(
        function(error, textContent) {
          assert.ok(textContent.indexOf('zzz') > -1);
      });
    });
  });
});
