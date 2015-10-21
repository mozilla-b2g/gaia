'use strict';
/* global MozActivity */

var Contacts = require('./lib/contacts');
var Dialer = require('../../../dialer/test/marionette/lib/dialer');
var Sms = require('./lib/sms');
var assert = require('assert');
var fs = require('fs');

marionette('Contacts > Activities', function() {
  var client = marionette.client({ profile: Contacts.config });

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

    setup(function() {
      smsSubject.launch(); // We open some app to start a Marionette session.
    });

    function getListItems() {
      return client.executeScript(function() {
        return document.querySelectorAll('#multiple-select-container li');
      });
    }

    test('> with only one contact', function() {
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_4.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'})
          }
        });
      }, [fs.readFileSync(__dirname + '/data/vcard_4.vcf', 'utf8')]);

      var iframe = 'iframe[src="' + Contacts.URL +
        '/contacts/views/vcard_load/vcard_load.html"]';
      client.switchToFrame();
      client.switchToFrame(client.findElement(iframe), {'focus': true});
      client.helper.waitForElement(selectors.multipleSelectSave);

      assert.ok(getListItems().length === 1); // vcard has one element
    });

    test('> with multiple contacts', function() {
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_21_multiple.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'})
          }
        });
      }, [fs.readFileSync(__dirname + '/data/vcard_21_multiple.vcf', 'utf8')]);

      var iframe = 'iframe[src="' + Contacts.URL +
        '/contacts/views/vcard_load/vcard_load.html"]';
      client.switchToFrame();
      client.switchToFrame(client.findElement(iframe), {'focus': true});
      client.helper.waitForElement(selectors.multipleSelectSave);

      assert.ok(getListItems().length === 2); // vcard has one element
    });
  });

  suite('webcontacts/contact activity', function() {

    // Disabling these tests by now due to we need a way to switch to an
    // activity instead of switching to an app, due to paths can differ.
    // More info in [1].
    // These test must be recovered once this bug will be landed.

    // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9

    test.skip('a contact with duplicate number shows merge page', function() {

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
    // Disabling these tests by now due to we need a way to switch to an
    // activity instead of switching to an app, due to paths can differ.
    // More info in [1].
    // These test must be recovered once this bug will be landed.

    // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9
    test.skip('Error message when no contacts', function() {

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
    // Disabling these tests by now due to we need a way to switch to an
    // activity instead of switching to an app, due to paths can differ.
    // More info in [1].
    // These test must be recovered once this bug will be landed.

    // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9
    test.skip('Creates only one instance of action menu', function() {
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
