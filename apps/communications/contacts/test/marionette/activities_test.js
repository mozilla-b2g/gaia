var Contacts = require('./lib/contacts');
var Dialer = require('./lib/dialer');
var Sms = require('./lib/sms');
var assert = require('assert');

marionette('Contacts > Activities', function() {
  var client = marionette.client(Contacts.config);

  var dialerSubject;

  var smsSubject;
  var smsSelectors;

  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    selectors = Contacts.Selectors;

    dialerSubject = new Dialer(client);

    smsSubject = new Sms(client);
    smsSelectors = Sms.Selectors;
  });

  suite('webcontacts/contact activity', function() {
    test('a contact with duplicate number shows merge page', function() {

      subject.launch();

      subject.addContact({
        givenName: 'From Contacts App',
        tel: 1111
      });

      client.apps.close(Contacts.URL, 'contacts');

      dialerSubject.launch();

      // Dialer keys don't work in b2g desktop for some reason yet,
      // So just manually fire off the activity
      client.executeScript(function() {
        var activity = new MozActivity({
          name: 'new',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': 1111
            }
          }
        });
      });

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');

      subject.enterContactDetails({
        givenName: 'From Dialer Activity'
      }, true);

      client.switchToFrame(client.findElement(selectors.duplicateFrame));

      var duplicateHeader = client.helper.
        waitForElement(selectors.duplicateHeader);
      var expectedResult = subject.l10n(
        '/locales-obj/en-US.json',
        'duplicatesFoundTitle');

      assert.equal(duplicateHeader.text(), expectedResult);
    });
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
        '/locales-obj/en-US.json',
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
      client.helper.waitForElement(selectors.bodyReady);

      client.helper.waitForElement(selectors.listContactFirst)
        .click();

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/locales-obj/en-US.json',
        'no_contact_phones');
      assert.equal(confirmText, expectedResult);
    });
  });
});
