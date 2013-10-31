var Contacts = require('./lib/contacts');
var Sms = require('./lib/sms');
var assert = require('assert');

marionette('Contacts > Activities', function() {
  var client = marionette.client(Contacts.config);
  var smsSubject;
  var smsSelectors;

  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    selectors = Contacts.Selectors;

    smsSubject = new Sms(client);
    smsSelectors = Sms.Selectors;
  });

  suite('webcontacts/tel activity', function() {
    test('Error message when no contacts', function() {

      smsSubject.launch();

      // Launch the activity directly as mozSms has problems
      // in b2g desktop.
      client.executeScript(function() {
        var activity = new MozActivity({
          name: 'pick',
          data: {
            type: 'webcontacts/tel'
          }
        });
      });

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');

      var confirmMsg = client.findElement(selectors.confirmBody);
      var expectedResult = subject.l10n(
        '/contacts/locales/contacts.en-US.properties',
        'noContactsActivity');
      assert.equal(confirmMsg.text(), expectedResult);
    });

    test('Error message selected contact has no number', function() {

      subject.launch();

      subject.addContact({
        givenName: 'No Phone Number'
      });

      client.apps.close(Contacts.URL, 'contacts');

      smsSubject.launch();

      client.executeScript(function() {
        var activity = new MozActivity({
          name: 'pick',
          data: {
            type: 'webcontacts/tel'
          }
        });
      });

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement('body .view-body');

      client.helper.waitForElement(selectors.listContactFirst)
        .click();

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/contacts/locales/contacts.en-US.properties',
        'no_contact_phones');
      assert.equal(confirmText, expectedResult);
    });
  });

});
