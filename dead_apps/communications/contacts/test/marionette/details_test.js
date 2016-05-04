'use strict';

var Contacts = require('./lib/contacts');
var ContactsData = require('./lib/contacts_data');
var assert = require('assert');
var ContactsListView = require('./lib/views/contact-list/view');

marionette('Contacts > Details', function() {
  var client = marionette.client({
    profile: Contacts.config,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
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

  suite('Favorite contact', function() {
    setup(function(){
      contactsData.createMozContact(testContact);
    });
    test('Mark contact as favorite', function() {
      var contactsListView = new ContactsListView(client);
      var contactDetailsView = contactsListView.goToContact();
      contactDetailsView.makeFavorited();
      assertContactData(testContact);
    });

    test('Favorite contact should appear in' +
      ' favorite and regular lists', function() {
      var contactsListView = new ContactsListView(client);
      var contactDetailsView = contactsListView.goToContact();
      contactDetailsView.makeFavorited();
      contactsListView = contactDetailsView.backtoContactsList();
      assert.ok(contactsListView.firstContact.displayed());
      assert.ok(contactsListView.firstFavorite.displayed());
    });
  });
});
