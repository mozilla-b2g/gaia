var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Details', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  test.skip('Display the phone number', function() {
    var tel = 1231231234;

    subject.addContact({
      givenName: 'Hello',
      tel: tel
    });

    client.helper.waitForElement(selectors.listContactFirstText)
      .click();

    subject.waitSlideLeft('details');

    var telNode = client.helper.waitForElement(selectors.detailsTelButtonFirst);
    assert.equal(telNode.text(), tel);
  });

});
