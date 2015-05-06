'use strict';

var Contacts = require('./lib/contacts');
var ContactsData = require('./lib/contacts_data');
var assert = require('assert');

marionette('Contacts > Details', function() {
  var client = marionette.client(Contacts.config);
  var subject, actions;
  var selectors;
  var contactsData = new ContactsData(client);
  var testContact;

  setup(function() {
    subject = new Contacts(client);
    actions = client.loader.getActions();
    subject.actions = actions;
    subject.launch();

    selectors = Contacts.Selectors;

    testContact = {
      tel: [{value: '1231231234', type: ['home']}],
      givenName: ['Hello'],
      familyName: ['World'],
      name: ['Hello World'],
      email: [{value: 'hello@example.com', type: ['home']}],
      adr: [{type: ['home'], pref: true, streetAddress: 'False Street 123'}],
      org: ['Mozilla'],
      note: ['This is a note about the contact.']
    };
  });

  function assertContactData(mozContact) {
    var telNode = client.helper.waitForElement(selectors.detailsTelButtonFirst);
    assert.equal(telNode.text(), mozContact.tel[0].value);

    var nameNode = client.helper.waitForElement(selectors.detailsContactName);
    assert.equal(nameNode.text(), mozContact.name[0]);

    var emailNode = client.helper.waitForElement(selectors.detailsEmail);
    assert.equal(emailNode.text(), mozContact.email[0].value);

    var addressNode = client.helper.waitForElement(selectors.detailsAddress);
    assert.equal(addressNode.text(), mozContact.adr[0].streetAddress);

    var orgNode = client.helper.waitForElement(selectors.detailsOrg);
    assert.equal(orgNode.text(), mozContact.org[0]);

    var noteNode = client.helper.waitForElement(selectors.detailsNote);
    assert.equal(noteNode.text(), mozContact.note[0]);
  }

  test('Regular contact is displayed correctly', function() {
    contactsData.createMozContact(testContact);
    client.helper.waitForElement(selectors.listContactFirstText).click();
    subject.waitSlideLeft('details');
    assertContactData(testContact);
    client.findElement(selectors.detailsLinkButton);
  });

  test('Facebook contact correctly displayed as social contact',
      function() {
    contactsData.createFbContact();
    client.helper.waitForElement(selectors.listContactFirstText).click();
    subject.waitSlideLeft('details');

    var fbLabel = client.helper.waitForElement(selectors.detailsSocialLabel);
    assert.equal(fbLabel.text(), 'FACEBOOK');

    var msgButton = client.helper.waitForElement(selectors.fbMsgButton);
    msgButton.enabled();

    var wallButton = client.helper.waitForElement(selectors.fbWallButton);
    wallButton.enabled();

    var profileButton = client.helper.waitForElement(selectors.fbProfileButton);
    profileButton.enabled();

    var coverImg = client.helper.waitForElement(selectors.detailsCoverImage);
    assert.ok(coverImg, 'Element should exist.');
    client.waitFor(function() {
      return coverImg.getAttribute('style').indexOf('background-image') > -1;
    });
  });

  test('Show contact with picture', function() {
    contactsData.createMozContact(testContact, true);
    client.helper.waitForElement(selectors.listContactFirstText).click();
    subject.waitSlideLeft('details');

    assertContactData(testContact);

    var coverImg = client.helper.waitForElement(selectors.detailsCoverImage);
    assert.ok(coverImg, 'Element should exist.');
    client.waitFor(function() {
      return coverImg.getAttribute('style').indexOf('background-image') != -1;
    });
  });

  test('Mark contact as favorite', function() {
    contactsData.createMozContact(testContact);

    client.helper.waitForElement(selectors.listContactFirstText).click();
    subject.waitSlideLeft('details');

    // It's not a favorite
    var nameNode = client.helper.waitForElement(selectors.detailsContactName);
    assert.equal(nameNode.getAttribute('class').indexOf('favorite'), -1);

    // Click on favorite
    client.helper.waitForElement(selectors.detailsFavoriteButton).click();
    nameNode = client.helper.waitForElement(selectors.detailsHeader);
    client.waitFor(function() {
      return nameNode.getAttribute('class').indexOf('favorite') != -1;
    });

    assertContactData(testContact);
  });

  test('Share Contact', function() {
    contactsData.createMozContact(testContact);

    client.helper.waitForElement(selectors.listContactFirstText).click();
    subject.waitSlideLeft('details');

    // Click on share button
    client.helper.waitForElement(selectors.detailsShareButton).click();

    var sysMenu = subject.systemMenu;

    // In the sysMenu they should appear at least the Messages and email apps
    var menuOptions = sysMenu.findElements('button');
    assert.ok(menuOptions.length >= 2);
  });
});
