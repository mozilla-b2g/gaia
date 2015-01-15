'use strict';
/* global MozActivity */

var Contacts = require('./lib/contacts');
var Dialer = require('../../../dialer/test/marionette/lib/dialer');
var Sms = require('./lib/sms');
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

    function assertDetailsData() {
      var detailsSelectors = [
        selectors.detailsContactName,
        selectors.detailsOrg,
        selectors.detailsTelButtonFirst + ' b',
        selectors.detailsEmail
      ];

      var dataArray = [
        'Forrest Gump',
        'Bubba Gump Shrimp Co.',
        '+1-111-555-1212',
        'forrestgump@example.com'
      ];

      var testObject = {};

      for (var i = 0, len = dataArray.length; i < len; i++) {
        testObject[detailsSelectors[i]] = dataArray[i];
      }

      for (var key in testObject) {
        var value = client.findElement(key).text();
        assert.equal(value, testObject[key]);
      }
    }

    function assertHidden(selector) {
      var classes = client.findElement(selector).getAttribute('class');
      assert.ok(classes.indexOf('hide') !== -1);
    }

    setup(function() {
      smsSubject.launch(); // We open some app to start a Marionette session.
    });

    test('open text/vcard activity (!allowSave) opens vCard in details view',
        function() {
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_4.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'}),
            allowSave: false
          }
        });
      }, [fs.readFileSync(__dirname + '/data/vcard_4.vcf', 'utf8')]);

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement(selectors.details);

      assertDetailsData();
      assertHidden(selectors.detailsSocialTemplate);
    });

    test('open text/vcard activity (allowSave) opens form filled', function() {
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_4.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'}),
            allowSave: true
          }
        });
      }, [fs.readFileSync(__dirname + '/data/vcard_4.vcf', 'utf8')]);

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement(selectors.form);

      assertFormData();
      assert.ok(client.findElement(selectors.formSave).enabled);
    });

    test('open text/vcard activity defaults to details view', function() {
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

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      client.helper.waitForElement(selectors.details);

      assertDetailsData();
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
        '/locales-obj/en-US.json',
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
        '/locales-obj/en-US.json',
        'no_contact_phones');
      assert.equal(confirmText, expectedResult);
    });
  });
});
