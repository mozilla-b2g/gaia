'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');
var fs = require('fs');

marionette('Contacts > Details', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  test.skip('Display the phone number', function() {
    var tel = 1231231234;

    subject.addContact({
      givenName: 'Hello',
      tel: tel
    });

    client.helper.waitForElement(selectors.listContactFirstText)
      .click();

    subject.waitSlideLeft('details');

    var telNode = client.helper.waitForElement(selectors.detailsTelButtonFirst);
    assert.equal(telNode.text(), tel);
  });

  test('Merging 15 contacts', function() {
    var tel = 666666666,
        name = 'María Covadonga',
        duplicateFrame,
        mergeClose,
        mergeAction;

    for (var i = 1; i <= name.length; i++) {
      subject.addContact({
        givenName: name.substring(0, i),
        tel: tel
      });
      if (i > 1) {
        duplicateFrame = duplicateFrame ||
          client.findElement(selectors.duplicateFrame);
        subject.waitForSlideUp(duplicateFrame);
        client.switchToFrame(duplicateFrame);
        mergeClose = client.helper.waitForElement(selectors.duplicateClose);
        subject.clickOn(mergeClose);
        client.switchToFrame();
        client.apps.switchToApp(Contacts.URL, 'contacts');
        subject.waitForSlideDown(duplicateFrame);
      }
    }

    var clickedContactName;
    var firstContactText = client.helper.waitForElement(
      selectors.listContactFirstText);
    clickedContactName = firstContactText.text();
    subject.clickOn(firstContactText);

    subject.waitSlideLeft('details');

    subject.clickOn(client.helper.waitForElement(
      selectors.detailsFindDuplicate));

    subject.waitForSlideUp(duplicateFrame);
    client.switchToFrame(duplicateFrame);
    mergeAction = client.helper.waitForElement(selectors.duplicateMerge);
    subject.clickOn(mergeAction);
    client.switchToFrame();
    client.apps.switchToApp(Contacts.URL, 'contacts');
    subject.waitForSlideDown(duplicateFrame);

    var detailsEditContact = client.helper.waitForElement(
      selectors.detailsEditContact);
    subject.clickOn(detailsEditContact);

    subject.waitForFormShown();

    var formHeader = client.helper.waitForElement(selectors.formTitle);
    var expectedResult = subject.l10n('/locales-obj/en-US.json',
                                      'editContact');
    var formContactName = client.helper.waitForElement(
      selectors.formGivenName);

    assert.equal(formHeader.text(), expectedResult);
    assert.equal(formContactName.getAttribute('value'), clickedContactName);
  });

  test('Favorite FB contact and edit it', function() {
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

    client.helper.waitForElement(selectors.listContactFirstText)
      .click();

    subject.waitSlideLeft('details');

    // Check we loaded the FB contact
    var telNode = client.helper.waitForElement(selectors.detailsTelButtonFirst);
    assert.equal(telNode.text(), '+34666666666');

    // It's not a favorite
    var nameNode = client.helper.waitForElement(selectors.detailsContactName);
    assert.equal(nameNode.getAttribute('class').indexOf('favorite'), -1);

    // Click on favorite
    client.helper.waitForElement(selectors.detailsFavoriteButton).click();
    nameNode = client.helper.waitForElement(selectors.detailsContactName);
    assert.notEqual(nameNode.getAttribute('class').indexOf('favorite'), -1);

    // Click on edit and go to the edit form
    client.helper.waitForElement(selectors.detailsEditContact).click();
    subject.waitForFormShown();
  });

});
