'use strict';

var Contacts = require('./lib/contacts');
var Actions = require('marionette-client').Actions;
var assert = require('assert');

marionette('Contacts > ICE contacts', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;
  var actions = new Actions(client);

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
    var tel = addTelephone ? '655555555' : undefined;
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

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

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
        '/locales-obj/en-US.json',
        'ICERepeatedContact');
      assert.equal(confirmText, expectedResult);
    });

    test('Contact must have a phone number', function() {
      addTestContact(false); // Added contact without phone
      setFirstContactAsICE();

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/locales-obj/en-US.json',
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

    setup(function() {
      addTestContact(true);
      setFirstContactAsICE();
      clickBackArrow();

      var closeSettings = client.helper.waitForElement(selectors.settingsClose);
      subject.clickOn(closeSettings);

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
    });

    test('Confirm window appears with correct message', function() {
      var confirmBody = client.helper.waitForElement(selectors.confirmBody);

      var expectedResult = subject.l10n(
        '/locales-obj/en-US.json',
        'ICEContactDelTelAll');

      assert.equal(confirmBody.text(), expectedResult);
    });

    test('Contact is deleted from ICE when no numbers left', function() {
      dismissAndGoBack();
      openICESettings();
      assert.ok(!client.helper.waitForElement(selectors.iceButton1).enabled());
    });

    test('ICE list empty after removing phone', function() {
      dismissAndGoBack();
      client.helper.waitForElement(selectors.contactListHeader);
      assert.ok(isIceContactsGroupHidden());
    });
  });
});
