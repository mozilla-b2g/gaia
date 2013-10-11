var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Search', function() {
  var client = marionette.client();
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

      client.helper.waitForElement(selectors.searchLabel);
      client.findElement(selectors.searchLabel)
        .click();

      client.helper.waitForElement(selectors.searchCancel);
      client.findElement(selectors.searchCancel)
        .click();

      client.helper.waitForElement(selectors.list);
      assert.ok(true, 'Returned to list view.');
    });
  });

});
