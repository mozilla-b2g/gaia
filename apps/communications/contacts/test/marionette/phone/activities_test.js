'use strict';
/* global MozActivity */

var Contacts = require('../lib/contacts');
var Dialer = require('../../../../dialer/test/marionette/lib/dialer');
var Sms = require('../lib/sms');
var assert = require('assert');
var fs = require('fs');

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

  suite('open text/vcard activity', function() {
    function assertFormData() {
      var formSelectors = [
        selectors.formGivenName,
        selectors.formFamilyName,
        selectors.formOrg,
        selectors.formTel,
        selectors.formEmailFirst
      ];

      var dataArray = [
        'Forrest',
        'Gump',
        'Bubba Gump Shrimp Co.',
        '+1-111-555-1212',
        'forrestgump@example.com'
      ];

      var testObject = {};

      for (var i = 0, len = dataArray.length; i < len; i++) {
        testObject[formSelectors[i]] = dataArray[i];
      }

      for (var key in testObject) {
        var value = client.findElement(key).getAttribute('value');
        assert.equal(value, testObject[key]);
      }
    }

    setup(function() {
      smsSubject.launch(); // We open some app to start a Marionette session.
    });

    test('open text/vcard activity opens form filled', function() {
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_4.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'})
          }
        });
      }, [fs.readFileSync(__dirname + '/../data/vcard_4.vcf', 'utf8')]);

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement(selectors.form);

      assertFormData();
      assert.ok(client.findElement(selectors.formSave).enabled);
    });
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
        new MozActivity({
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
        '/locales-obj/contacts.matching_contacts.en-US.json',
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
        new MozActivity({
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
        '/locales-obj/contacts.index.en-US.json',
        'noContactsActivity2');
      assert.equal(confirmMsg.text(), expectedResult);
    });

    test.skip('Error message selected contact has no number', function() {

      subject.launch();

      subject.addContact({
        givenName: 'No Phone Number'
      });

      client.apps.close(Contacts.URL, 'contacts');

      smsSubject.launch();

      client.executeScript(function() {
        new MozActivity({
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
        '/locales-obj/contacts.index.en-US.json',
        'no_contact_phones');
      assert.equal(confirmText, expectedResult);
    });
  });

  suite('webcontacts/email activity', function() {
    test('Creates only one instance of action menu', function() {
      subject.launch();

      subject.addContactMultipleEmails({
        givenName: 'From Contacts App',
        emailFirst: 'first@personal.com',
        emailSecond: 'second@personal.com'
      });

      client.apps.close(Contacts.URL, 'contacts');

      smsSubject.launch();

      client.executeScript(function() {
        new MozActivity({
          name: 'pick',
          data: {
            type: 'webcontacts/email'
          }
        });
      });

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement(selectors.bodyReady);

      var contact = client.helper.waitForElement(selectors.listContactFirst);

      // Simulate two clicks
      contact.click();
      contact.click();

      var emailList = client.helper.waitForElement(selectors.actionMenuList);
      var emailChildren = emailList.findElements('button');
      assert.equal(emailChildren.length, 3);
    });
  });
});
