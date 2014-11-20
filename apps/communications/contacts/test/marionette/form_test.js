'use strict';

var Contacts = require('./lib/contacts'),
    ContactsData = require('./lib/contacts_data'),
    Dialer = require('../../../dialer/test/marionette/lib/dialer'),
    assert = require('assert');

marionette('Contacts > Form', function() {
  var client = marionette.client(Contacts.config),
    subject,
    contactsData,
    dialerSubject,
    dialerSelectors,
    selectors;

  setup(function() {
    subject = new Contacts(client);
    contactsData = new ContactsData(client);
    selectors = Contacts.Selectors;
    dialerSubject = new Dialer(client);
    dialerSelectors = Dialer.Selectors;
    subject.launch();
  });

  var contactData = {
    givenName: ['Jose'],
    familyName: ['Cantera'],
    org: ['EDM'],
    tel: [{
      type: ['mobile'],
      value: '637654321'
    }]
  };

  function editFirstContact() {
    var firstContact = client.helper.waitForElement(selectors.listContactFirst);
    subject.clickOn(firstContact);

    subject.waitSlideLeft('details');

    var edit = client.helper.waitForElement(selectors.detailsEditContact);
    subject.clickOn(edit);
    subject.waitForFadeIn(client.helper.waitForElement(selectors.form));
  }

  function editContactPhoto() {
    editFirstContact();

    var photoChangeButton = client.helper.waitForElement(
                                                    selectors.formPhotoButton);
    subject.clickOn(photoChangeButton);
  }

  suite('> Add Contact', function() {
    test('Add a simple contact', function() {
      var givenName = 'Hello';
      var familyName = 'World';

      subject.addContact({
        givenName: givenName,
        familyName: familyName
      });

      var listView = client.helper.waitForElement(selectors.list);
      assert.ok(listView.displayed(), 'List view is shown.');

      var listElementText = client.helper.waitForElement(
        selectors.listContactFirst).text();

      assert.notEqual(listElementText.indexOf(givenName), -1);
      assert.notEqual(listElementText.indexOf(familyName), -1);
    });
  });

  suite('> Edit Contact', function() {
    test('Simple edition of contact details. ORG field', function() {
      contactsData.createMozContact(contactData);

      editFirstContact();

      client.helper.waitForElement(selectors.formOrg).sendKeys('v2');
      client.helper.waitForElement(selectors.formSave).click();

      subject.waitForFadeIn(client.helper.waitForElement(selectors.details));
      var edit = client.helper.waitForElement(selectors.detailsEditContact);
      subject.clickOn(edit);
      subject.waitForFadeIn(client.helper.waitForElement(selectors.form));

      var orgField = client.helper.waitForElement(selectors.formOrg);
      var orgFieldValue = orgField.getAttribute('value');

      assert.ok(orgFieldValue.trim() === 'v2EDM');
    });

    test('Can create custom label', function() {
      contactsData.createMozContact(contactData);
      editFirstContact();

      client.helper.waitForElement(selectors.formTelLabelFirst).click();
      subject.waitSlideLeft('formCustomTagPage');

      client.helper.waitForElement(selectors.formCustomTag).sendKeys('BFF');
      client.helper.waitForElement(selectors.formCustomTagDone).click();

      // Wait for the custom tag page to disappear
      var bodyWidth = client.findElement(selectors.body).size().width;
      client.waitFor(function waiting() {
        var tagPage = client.findElement(selectors.formCustomTagPage);
        var location = tagPage.location();
        return location.x >= bodyWidth;
      });

      client.findElement(selectors.formSave).click();
      subject.waitForFadeIn(client.helper.waitForElement(selectors.details));

      client.helper.waitForElement(selectors.detailsTelLabelFirst);
      client.waitFor(function waiting() {
        var label = client.helper.
          waitForElement(selectors.detailsTelLabelFirst);
        return label.text() === 'BFF';
      });
      assert.ok(true, 'custom label is updated.');
    });

    suite('> Edit Contact Photo', function() {
      setup(function() {
        // We create a mozContact with a photo
        contactsData.createMozContact(contactData, true);
      });

      function areRemoveAndChangePresent() {
        return client.executeScript(function(selector) {
          var buttons = document.querySelectorAll(selector);
          var out = 0;
          for(var j = 0; j < buttons.length; j++) {
            if (buttons[j].textContent === 'Remove photo') {
              out++;
            }
            if (buttons[j].textContent === 'Change photo') {
              out++;
            }
          }
          return out === 2;
        }, ['#value-menu button']);
      }

      test('Edit regular Contact with image', function() {
        editContactPhoto();

        client.helper.waitForElement(selectors.actionMenu);

        assert.ok(areRemoveAndChangePresent());
      });

    });
  });

  suite('> Facebook contacts', function() {
    var fbContactData;

    setup(function() {
      fbContactData = contactsData.createFbContact();
    });

    function isGalleryButtonPresent() {
      return client.executeScript(function(selector) {
        var buttons = document.querySelectorAll(selector);
        var out = false;
        for(var j = 0; j < buttons.length; j++) {
          if (buttons[j].textContent === 'Gallery') {
            out = true;
          }
        }
        return out;
      }, [selectors.buttonActivityChooser]);
    }

    test('Add phone number from Dialer to existing Facebook contact',
      function() {
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
                                  dialerSelectors.addToExistingContactMenuItem);
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

    test('Contact Photo cannot be removed', function() {
      editContactPhoto();

      // As it is a Facebook contact it should appear the activity window
      // to choose the source for the image
      client.switchToFrame();
      client.helper.waitForElement(selectors.activityChooser);

      assert.ok(isGalleryButtonPresent());
    });
  }); // Facebook Contacts
});
