'use strict';

var Contacts = require('./lib/contacts');
var Actions = require('marionette-client').Actions;
var assert = require('assert');

marionette('Contacts > ICE contacts', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;
  var actions = new Actions(client);

  setup(function() {
    subject = new Contacts(client);
    subject.launch();
    selectors = Contacts.Selectors;
  });

  suite('ICE contacts', function() {

    test('Check ICE settings transition', function() {
      subject.addContact({
        givenName: 'Jose'
      });

      client.helper.waitForElement(selectors.settingsButton)
        .click();

      client.helper.waitForElement(selectors.setIceButton)
        .click();

      var iceSwitch1 = client.helper.waitForElement(selectors.iceSwitch1);
      subject.clickOn(iceSwitch1);

      var iceButton1 = client.helper.waitForElement(selectors.iceButton1);
      subject.clickOn(iceButton1);

      var contactsHeader =
        client.helper.waitForElement(selectors.contactListHeader);

      actions.wait(0.5);

      actions.tap(contactsHeader, 10, 10).perform();

      var iceSwitch2 = client.helper.waitForElement(selectors.iceSwitch2);
      subject.clickOn(iceSwitch2);

      var iceButton2 = client.helper.waitForElement(selectors.iceButton2);
      subject.clickOn(iceButton2);

      actions.wait(0.5);

      actions.tap(contactsHeader, 10, 10).perform();

    });

  });

  suite('ICE settings', function() {
    test('ICE contacts can\'t be repeat', function() {

      var detailsContact1 = {
        givenName: 'Benito Aparicio',
        tel: '123123123'
      };

      subject.addContact(detailsContact1);

      client.helper.waitForElement(selectors.settingsButton)
        .click();

      client.helper.waitForElement(selectors.setIceButton)
        .click();

      var iceSwitch1 = client.helper.waitForElement(selectors.iceSwitch1);
      subject.clickOn(iceSwitch1);

      var iceButton1 = client.helper.waitForElement(selectors.iceButton1);
      subject.clickOn(iceButton1);

      var listContactFirstText = 
        client.helper.waitForElement(selectors.listContactFirstText);
      subject.clickOn(listContactFirstText);

      var iceSwitch2 = client.helper.waitForElement(selectors.iceSwitch2);
      subject.clickOn(iceSwitch2);

      var iceButton2 = client.helper.waitForElement(selectors.iceButton2);
      subject.clickOn(iceButton2);

      subject.clickOn(listContactFirstText);

      var confirmText = client.helper.waitForElement(selectors.confirmBody)
        .text();

      var expectedResult = subject.l10n(
        '/locales-obj/en-US.json',
        'ICERepeatedContact');
      assert.equal(confirmText, expectedResult);

    });
  });

});
