var Contacts = require('./lib/contacts'),
    Dialer = require('../../../dialer/test/marionette/lib/dialer'),
    assert = require('assert'),
    fs = require('fs');

marionette('Contacts > Form', function() {
  var client = marionette.client(Contacts.config),
    subject,
    dialerSubject,
    selectors;

  setup(function() {
    subject = new Contacts(client);
    selectors = Contacts.Selectors;
    dialerSubject = new Dialer(client);
    dialerSelectors = Dialer.Selectors;
    subject.launch();
  });

  suite('Click phone number', function() {
    test('Add a simple contact', function() {
      var givenName = 'Hello';
      var familyName = 'World';

      subject.addContact({
        givenName: givenName,
        familyName: familyName
      });

      var listView = client.helper.waitForElement(selectors.list);
      assert.ok(listView.displayed(), 'List view is shown.');

      var listElementText = client.helper
        .waitForElement(selectors.listContactFirst)
        .text();

      assert.notEqual(listElementText.indexOf(givenName), -1);
      assert.notEqual(listElementText.indexOf(familyName), -1);
    });

    test('Can create custom label', function() {
      subject.addContact({
        givenName: 'Custom Label Test',
        tel: 1231231234
      });

      client.helper.waitForElement(selectors.listContactFirstText)
        .click();

      subject.waitSlideLeft('details');

      client.helper.waitForElement(selectors.detailsEditContact)
        .click();

      subject.waitForFormShown();

      client.helper.waitForElement(selectors.formTelLabelFirst)
        .click();

      subject.waitSlideLeft('formCustomTagPage');

      client.helper.waitForElement(selectors.formCustomTag)
        .sendKeys('BFF');

      client.helper.waitForElement(selectors.formCustomTagDone)
        .click();

      // Wait for the custom tag page to disappear
      var bodyWidth = client.findElement(selectors.body).size().width;
      client.waitFor(function waiting() {
        var tagPage = client.findElement(selectors.formCustomTagPage);
        var location = tagPage.location();
        return location.x >= bodyWidth;
      });

      client.findElement(selectors.formSave)
        .click();

      subject.waitForFormTransition();
      client.helper.waitForElement(selectors.detailsTelLabelFirst);
      client.waitFor(function waiting() {
        var label = client.findElement(selectors.detailsTelLabelFirst).text();
        return label === 'BFF';
      });
      assert.ok(true, 'custom label is updated.');
    });
  });

  suite('Facebook contacts', function() {
    test('Add phone number from Dialer to existing Facebook contact',
      function() {
        client.importScript(fs.readFileSync(__dirname +
                                            '/data/facebook_contact_data.js',
                                            'utf8'));

        var saveFBContact = function() {
          var fb = window.wrappedJSObject.fb,
              data = window.wrappedJSObject.data;

          var fbContact = new fb.Contact();
          fbContact.setData(data.fbContactData);

          var savingFBContact = fbContact.save();

          savingFBContact.onsuccess = function() {
            marionetteScriptFinished(data.fbContactData);
          };

          savingFBContact.onerror = function() {
            marionetteScriptFinished();
          };
        };

        var fbContactData;
        client.executeAsyncScript(saveFBContact, function(err, val) {
          fbContactData = val;
        });

        client.waitFor(function() {
          return fbContactData;
        });

        client.apps.close(Contacts.URL, 'contacts');

        dialerSubject.launch();

        var one = client.findElement(dialerSelectors.one),
            two = client.findElement(dialerSelectors.two),
            three = client.findElement(dialerSelectors.three);
        for (var i = 0; i < 3; i++) {
          one.tap();
          two.tap();
          three.tap();
        }
        var phoneNumber = dialerSubject.client.findElement(
          dialerSelectors.phoneNumber);
        client.waitFor(function() {
          return (phoneNumber.getAttribute('value').length === 9);
        });

        var addContact = dialerSubject.client.findElement(
          dialerSelectors.keypadCallBarAddContact);
        addContact.tap();

        var addToExistingContact = dialerSubject.client.helper.waitForElement(
          dialerSelectors.addToExistintContactMenuItem);
        addToExistingContact.tap();

        client.switchToFrame();
        client.apps.switchToApp(Contacts.URL, 'contacts');

        client.findElement(selectors.listContactFirst).tap();

        subject.waitForFormShown();

        var formTelNumberSecond = client.helper.waitForElement(
          selectors.formTelNumberSecond);
        var formEmailFirst = client.helper.waitForElement(
          selectors.formEmailFirst);

        assert.equal(formTelNumberSecond.getAttribute('value'),
               fbContactData.tel[0].value);
        assert.equal(formEmailFirst.getAttribute('value'),
               fbContactData.email[0].value);
      });
  });
});
