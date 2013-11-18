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

  suite('Click phone number', function() {
    test('Shows error /w no sim', function() {
      var tel = 1231231234;

      subject.addContact({
        givenName: 'Hello',
        tel: 1231231234
      });

      client.helper.waitForElement(selectors.listContactFirstText)
        .click();

      subject.waitSlideLeft('details');

      client.helper.waitForElement(selectors.detailsTelButtonFirst)
        .click();

      var header = client.helper.waitForElement(selectors.confirmHeader);

      var expectedHeaderText = subject.l10n(
        '/dialer/locales/shared.en-US.properties',
        'emergencyDialogTitle');

      assert.equal(header.text(), expectedHeaderText);
    });
  });

});
