'use strict';
/* global MozActivity */

var Contacts = require('./lib/contacts');
var Sms = require('./lib/sms');
var assert = require('assert');
var fs = require('fs');

marionette('Contacts > MultipleSelect', function() {
  var client = marionette.client({
    profile: Contacts.config,
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var subject;
  var smsSubject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    smsSubject = new Sms(client);
    selectors = Contacts.Selectors;
  });

  suite('Import', function() {
    function getNumberOfContacts(callback) {
      client.executeAsyncScript(function() {
        var request = navigator.mozContacts.getCount();
        request.onsuccess = function() {
          marionetteScriptFinished(request.result);
        };
      }, callback);
    }

    setup(function() {
      smsSubject.launch();
      client.executeScript(function(vCardFile) {
        new MozActivity({
          name: 'open',
          data: {
            type: 'text/vcard',
            filename: 'vcard_21_multiple.vcf',
            blob: new Blob([vCardFile], {type: 'text/vcard'}),
            allowSave: true
          }
        });
      }, [fs.readFileSync(__dirname + '/data/vcard_21_multiple.vcf', 'utf8')]);

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
    });

    test('Importing all contacts', function() {
      client.helper.waitForElement(selectors.multipleSelectSave).click();
      var status = client.helper.waitForElement(selectors.multipleSelectStatus);
      assert.ok(status.text().indexOf('2') >= 0);
      getNumberOfContacts(function(err, value) {
        assert.equal(value, 2);
      });
    });
  });
});
