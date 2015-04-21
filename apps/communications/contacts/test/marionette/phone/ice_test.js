'use strict';

var Contacts = require('../lib/contacts');
var ContactsData = require('../lib/contacts_data');
var assert = require('assert');

marionette('Contacts > ICE contacts', function() {
  var client = marionette.client(Contacts.config);
  var contactsData = new ContactsData(client);
  var actions, subject, selectors;

  var testContactTelNumber = '655555555';

  var testContact = {
    givenName: ['Hello'],
    tel: [{
      type: ['mobile'],
      value: testContactTelNumber
    }]
  };

  setup(function() {
    subject = new Contacts(client);
    actions = client.loader.getActions();
    subject.actions = actions;
    subject.launch();
    selectors = Contacts.Selectors;
  });

  function setFirstContactAsICE() {
    openICESettings();
    clickICESwitch(1);

    var listContactFirstText =
      client.helper.waitForElement(selectors.listContactFirstText);
    subject.clickOn(listContactFirstText);
  }

  function clickICESwitch(switchNumber){
    var iceSwitch =
            client.helper.waitForElement(selectors['iceSwitch' + switchNumber]);
    subject.clickOn(iceSwitch);

    var iceButton =
            client.helper.waitForElement(selectors['iceButton' + switchNumber]);
    subject.clickOn(iceButton);
  }

  function openICESettings() {
    var settingsBtn = client.helper.waitForElement(selectors.settingsButton);
    subject.clickOn(settingsBtn);

    var settings = client.helper.waitForElement(selectors.settingsView);
    subject.waitForFadeIn(settings);

    client.helper.waitForElement(selectors.setIceButton).click();
  }

  function addTestContact(addTelephone) {
    var tel = addTelephone ? testContactTelNumber : undefined;
    subject.addContact({
      givenName: 'Hello',
      tel: tel
    });
  }

  function clickBackArrow() {
    var contactsHeader =
        client.helper.waitForElement(selectors.iceSettingsHeader);

    actions.wait(0.5).tap(contactsHeader, 10, 10).perform();
  }

  function isIceContactsGroupHidden() {
    return client.executeScript(function(selector) {
      return document.querySelector(selector).classList.contains('hide');
    }, [selectors.iceGroupOpen]);
  }

  function assertICEContact(position, name) {
    var iceContact = client.helper.waitForElement(
                       selectors['iceButton' + position]);
    assert.equal(iceContact.text(), name);

    var checked = client.executeScript(function(selector) {
      return document.querySelector(selector).checked;
    }, [selectors['iceInputSwitch' + position]]);
    assert.ok(checked);
  }

  function assertICEContactNotSet(position) {
    var checked = client.executeScript(function(selector) {
      return document.querySelector(selector).checked;
    }, [selectors['iceInputSwitch' + position]]);

    assert.ok(!checked);
  }

  // Creates a mozContact by calling the mozContacts API
  function createMozContact(contactData) {
    return contactsData.createMozContact(contactData);
  }

  function setICEContacts(iceContactsList) {
    var doSetICEContacts = function(iceContactsList) {
      var LazyLoader = window.wrappedJSObject.LazyLoader;

      LazyLoader.load([
        '/shared/js/contacts/utilities/ice_store.js',
        '/contacts/js/utilities/ice_data.js',
        '/shared/js/async_storage.js'
      ], function() {
          var ICEData = window.wrappedJSObject.ICEData;
          ICEData.setICEContacts(iceContactsList).then(function() {
            marionetteScriptFinished(true);
          }, function(error) {
              console.error('Error while setting ICE ', error);
              marionetteScriptFinished(false);
          });
      });
    };

    var iceContactsSet = false;
    client.executeAsyncScript(doSetICEContacts, [iceContactsList],
      function(err, val) {
        iceContactsSet = val;
    });

    client.waitFor(function() {
      return iceContactsSet;
    });
  }

  function setICEContact(position, contact) {
    var contactId = createMozContact(contact || testContact);
    var iceContacts = [null, null];
    iceContacts[position - 1] = contactId;

    setICEContacts(iceContacts);
  }

  function createAndSetICEContacts(contactList) {
    var iceList = [];
    contactList.forEach(function(aContact) {
      var contactId = createMozContact(aContact);
      iceList.push(contactId);
    });

    setICEContacts(iceList);
  }

  suite('ICE settings', function() {
    test('Check ICE settings transition', function() {
      addTestContact();
      openICESettings();
      clickICESwitch(1);
      clickBackArrow();
      clickICESwitch(2);
      clickBackArrow();
    });

    test('Clicking on ICE button does not toggle the switch', function() {
      addTestContact();
      openICESettings();

      var iceButton1 = client.helper.waitForElement(selectors.iceButton1);
      subject.clickOn(iceButton1);

      var checked = client.executeScript(function(selector) {
        return document.querySelector(selector).checked;
      }, [selectors.iceInputSwitch1]);

      assert.ok(!checked);
    });

    test('Select ICE contact from search, go back to ICE settings', function() {
      addTestContact(true);
      openICESettings();
      clickICESwitch(1);

      var searchLabel = client.helper.waitForElement(selectors.searchLabel);
      subject.clickOn(searchLabel);

      // We search for the first letter of givenName in addTestContact()
      client.helper.waitForElement(selectors.searchInput).sendKeys('H');
      client.helper.waitForElement(selectors.searchResultFirst).click();

      clickBackArrow();

      var settingsClose = client.helper.waitForElement(selectors.settingsClose);
      subject.clickOn(settingsClose);

      var openIce = client.helper.waitForElement(selectors.iceGroupOpen);
      subject.clickOn(openIce);

      var iceContact = client.helper.waitForElement(selectors.iceContact);
      // 'Hello' is givenName in addTestContact()
      assert.ok(iceContact.text().indexOf('Hello') >= 0,
        'The name of the contact should appear as ICE contact');
    });


    test('ICE contacts can\'t be repeated', function() {
      addTestContact(true);
      setFirstContactAsICE();
      clickICESwitch(2);

      var listContactFirstText =
        client.helper.waitForElement(selectors.listContactFirstText);

      subject.clickOn(listContactFirstText);

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/locales-obj/contacts.index.en-US.json',
        'ICERepeatedContact');
      assert.equal(confirmText, expectedResult);
    });

    test('Contact must have a phone number', function() {
      addTestContact(false); // Added contact without phone
      setFirstContactAsICE();

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/locales-obj/contacts.index.en-US.json',
        'ICEContactNoNumber');

      assert.equal(confirmText, expectedResult);
    });
  });

  suite('ICE contacts edition', function() {
    function dismissAndGoBack() {
      client.helper.waitForElement(selectors.confirmDismiss).click();

      var header = client.helper.waitForElement(selectors.detailsHeader);
      actions.wait(0.5).tap(header, 10, 10).perform();
    }

    function deleteFirstContactFirstTel() {
      var firstContact =
        client.helper.waitForElement(selectors.listContactFirst);
      subject.clickOn(firstContact);

      var edit = client.helper.waitForElement(selectors.detailsEditContact);
      subject.clickOn(edit);
      subject.waitForFadeIn(client.helper.waitForElement(selectors.form));
      client.findElement(selectors.formDelFirstTel).click();

      var save = client.findElement(selectors.formSave);
      save.enabled();
      save.click();
    }

    function closeSettings() {
      var close = client.helper.waitForElement(selectors.settingsClose);
      subject.clickOn(close);
    }

    suite('With one phone number', function() {
      setup(function() {
        addTestContact(true);
        setFirstContactAsICE();
        clickBackArrow();
        closeSettings();
        deleteFirstContactFirstTel();
      });

      test('Confirm window appears with correct message', function() {
        var confirmBody = client.helper.waitForElement(selectors.confirmBody);

        var expectedResult = subject.l10n(
          '/locales-obj/contacts.index.en-US.json',
          'ICEContactDelTelAll');

        assert.equal(confirmBody.text(), expectedResult);
      });

      test('Contact is deleted from ICE when no numbers left', function() {
        dismissAndGoBack();
        openICESettings();
        var iceButton1 = client.helper.waitForElement(selectors.iceButton1);
        assert.ok(!iceButton1.enabled());
      });

      test('ICE list empty after removing phone', function() {
        dismissAndGoBack();
        client.helper.waitForElement(selectors.contactListHeader);
        assert.ok(isIceContactsGroupHidden());
      });
    });

    suite('With more than one phone number', function() {
      test('Deleting the first number keeps the contact as ICE', function() {
        var mozContact = {
          tel: [
            {
              value: '01234',
              type: ['home']
            },
            {
              value: '56789',
              type:['home']
            }
          ],
          givenName: ['Hello'],
          familyName: ['World'],
          name: ['Hello World']
        };
        createMozContact(mozContact);
        setFirstContactAsICE();
        clickBackArrow();
        closeSettings();
        deleteFirstContactFirstTel();
        dismissAndGoBack();

        subject.waitForFadeIn(client.helper.waitForElement(selectors.list));
        openICESettings();
        assertICEContact(1, mozContact.name[0]);
      });
    });
  });

  suite('ICE contacts and Merge', function() {
    // Merges a duplicate contact and closes the duplicates iframe
    function mergeDuplicate() {
      var duplicateFrame = client.findElement(selectors.duplicateFrame);
      subject.waitForSlideUp(duplicateFrame);
      client.switchToFrame(duplicateFrame);
      var mergeAction = client.helper.waitForElement(selectors.duplicateMerge);
      subject.clickOn(mergeAction);

      client.switchToFrame();
      client.apps.switchToApp(Contacts.URL, 'contacts');
      subject.waitForSlideDown(duplicateFrame);
    }

    function setTwoICEDuplicates() {
      var duplicateContact = testContact;

      var contactId1 = createMozContact(duplicateContact);
      var contactId2 = createMozContact(duplicateContact);

      setICEContacts([contactId1, contactId2]);
    }

    function addNewAndMatchTest(position) {
      addTestContact(true);

      mergeDuplicate();

      // Now we go back to the ICE settings and check that our ICE remains
      subject.waitForFadeIn(client.helper.waitForElement(selectors.list));
      openICESettings();
      assertICEContact(position, 'Hello');
    }

    function findDuplicatesAndMatchTest(position) {
      var secondContactID = createMozContact({
        givenName: ['Hello'],
        tel: [{
          type: ['mobile'],
          value: testContactTelNumber
        }]
      });

      var selectorForSecondContact = 'li[data-uuid="' + secondContactID + '"]';

      // Going to the recently created contact
      var listContactElement =
              client.helper.waitForElement(selectorForSecondContact);
      subject.clickOn(listContactElement);
      subject.waitSlideLeft('details');

      var findDups = client.helper.waitForElement(selectors.findDupsButton);
      subject.clickOn(findDups);

      mergeDuplicate();

      subject.backToList();

      openICESettings();
      assertICEContact(position, 'Hello');
    }

    function editAndMatchTest(position) {
      subject.addContact({
        givenName: 'Good Bye',
        tel: '+34638883074'
      });

      var selectorForSecondContact = 'li[data-group="G"].contact-item';

      // Going to the recently created contact
      var listContactElement =
              client.helper.waitForElement(selectorForSecondContact);
      subject.clickOn(listContactElement);

      // Editing contact
      subject.editContact();
      // Adding a tel number equal to the tel number of 'Hello'
      client.findElement(selectors.formAddNewTel).click();
      client.helper.waitForElement(selectors.formTelNumberSecond).
                                              sendKeys(testContactTelNumber);
      // Saving the contact
      var save = client.findElement(selectors.formSave);
      save.enabled();
      save.click();

      mergeDuplicate();

      subject.backToList();

      openICESettings();
      assertICEContact(position, 'Good Bye');
    }

    suite('> 1 ICE Contact. Position 1', function() {
      setup(function() {
        setICEContact(1);
      });

      test('> Add a new Contact that matches ICE Contact', function() {
        addNewAndMatchTest(1);
        assertICEContactNotSet(2);
      });

      test('> Find duplicates. ICE Contact Matches', function() {
        findDuplicatesAndMatchTest(1);
        assertICEContactNotSet(2);
      });

      test('> Edit existing, change data. ICE Matches. ICE changed',
        function() {
          editAndMatchTest(1);
          assertICEContactNotSet(2);
      });
    });

    suite('> 1 ICE Contact. Position 2', function() {
      setup(function() {
        setICEContact(2);
      });

      test('> Add a new Contact that matches ICE Contact', function() {
        addNewAndMatchTest(2);
        assertICEContactNotSet(1);
      });

      test('> Find duplicates. ICE Contact Matches', function() {
        findDuplicatesAndMatchTest(2);
        assertICEContactNotSet(1);
      });

      test('> Edit existing, change data. ICE Matches. ICE changed',
        function() {
          editAndMatchTest(2);
          assertICEContactNotSet(1);
      });
    });

    suite('> 2 ICE Contacts. Change position 1. Keep Position 2', function() {
      setup(function() {
        createAndSetICEContacts([testContact, {
          givenName: ['Aufwiedersehen'],
          tel: [{
            type: ['mobile'],
            value: '9999999'
          }]
        }]);
      });

      test('> Add a new Contact that matches ICE Contact', function() {
        addNewAndMatchTest(1);
        assertICEContact(2, 'Aufwiedersehen');
      });

      test('> Find duplicates. ICE Contact Matches', function() {
        findDuplicatesAndMatchTest(1);
        assertICEContact(2, 'Aufwiedersehen');
      });

      test('> Edit existing, change data. ICE Matches. ICE changed',
        function() {
          editAndMatchTest(1);
          assertICEContact(2, 'Aufwiedersehen');
      });
    });

    suite('> 2 ICE Contacts. Change position 2. Keep Position 1', function() {
      setup(function() {
        createAndSetICEContacts([{
          givenName: ['Aufwiedersehen'],
          tel: [{
            type: ['mobile'],
            value: '9999999'
          }]
        }, testContact]);
      });

      test('> Add a new Contact that matches ICE Contact', function() {
        addNewAndMatchTest(2);
        assertICEContact(1, 'Aufwiedersehen');
      });

      test('> Find duplicates. ICE Contact Matches', function() {
        findDuplicatesAndMatchTest(2);
        assertICEContact(1, 'Aufwiedersehen');
      });

      test('> Edit existing, change data. ICE Matches. ICE changed',
        function() {
          editAndMatchTest(2);
          assertICEContact(1, 'Aufwiedersehen');
      });
    });

    suite('> 2 ICE Contacts which are merged', function() {
      setup(function() {
        setTwoICEDuplicates();
      });

      test('> Two ICE Contacts are merged into 1', function() {
        // Going to the recently created contact
        var listContactElement =
                client.helper.waitForElement(selectors.listContactFirst);
        subject.clickOn(listContactElement);
        subject.waitSlideLeft('details');

        var findDups = client.helper.waitForElement(selectors.findDupsButton);
        subject.clickOn(findDups);

        mergeDuplicate();

        subject.backToList();

        openICESettings();
        assertICEContact(1, 'Hello');
        assertICEContactNotSet(2);
      });

      test('> A third incoming Contact merges two ICE contacts', function() {
        addTestContact(true);

        mergeDuplicate();

        // Now we go back to the ICE settings and check that our ICE remains
        subject.waitForFadeIn(client.helper.waitForElement(selectors.list));
        openICESettings();
        assertICEContact(1, 'Hello');
        assertICEContactNotSet(2);
      });
    });
  });
});
