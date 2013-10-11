var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Details', function() {
  var client = marionette.client();
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  suite('Click phone number', function() {
    test('Shows error /w no sim', function() {
      var tel = 1231231234;

      subject.addContact({
        givenName: 'Hello',
        tel: 1231231234
      });

      client.helper.waitForElement(selectors.listContactFirst)
        .click();

      client.helper.waitForElement(selectors.details);

      var telSelector = 'button.icon-call[data-tel="' + tel + '"]';
      client.helper.waitForElement(telSelector);

      var telElement = client.findElement(telSelector);
      assert.ok(telElement);

      telElement.click();

      var header = client.waitForElement(selectors.confirmHeader);
      assert.equal(header.text(), 'No network connection');
    });
  });

});
