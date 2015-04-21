'use strict';

var Contacts = require('../lib/contacts');
var assert = require('assert');

marionette('Contacts > List', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  var agenda = [{ givenName: 'a' }, { givenName: 'b' }, { givenName: 'c' },
                { givenName: 'd' }, { givenName: 'e' }, { givenName: 'f' },
                { givenName: 'g' }, { givenName: 'h' }, { givenName: 'i' }];

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    agenda.forEach(function(contact) {
      subject.addContact(contact);
    });
    selectors = Contacts.Selectors;
  });

  function getNumberOfItemsVisited() {
    return client.executeScript(function() {
      return document.querySelectorAll('li[data-visited="true"]').length;
    });
  }

  suite('Visited contacts > ', function() {
    test('at least one has been visited by the imageLoader', function() {
      assert.ok(getNumberOfItemsVisited() > 0);
    });

    test('number of visited is the same after leaving search view', function() {
      var numItemsVisited = getNumberOfItemsVisited();
      client.findElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchCancel).click();
      assert.ok(getNumberOfItemsVisited() === numItemsVisited);
    });
  });
});
