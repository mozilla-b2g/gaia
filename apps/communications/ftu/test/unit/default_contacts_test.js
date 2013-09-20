'use strict';

requireApp('communications/ftu/test/unit/mock_navigator_contacts.js');
requireApp('communications/ftu/test/unit/mock_variant_manager.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');

requireApp('communications/ftu/js/customizers/default_contacts_customizer.js');

suite('default contacts >', function() {
  var realMozContacts, realMozContact;
  mocha.globals(['mozContact']);

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockNavigatorContacts;

    realMozContact = window.mozContact;
    window.mozContact = MockmozContact;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
    realMozContacts = null;

    window.mozContact = realMozContact;
    realMozContact = null;
  });

  var contacts = [
    {'givenName': ['Foo']},
    {'givenName': ['Bar']}
  ];

  function checkMockContacts(contacts) {
    var mockContacts = MockNavigatorContacts.contacts;
    assert.equal(mockContacts.length, contacts.length);
    for (var i = 0; i < mockContacts.length; ++i) {
      assert.equal(mockContacts[i].givenName[0], contacts[i].givenName[0]);
    }
  }

  test('does not respond to different customization event ', function() {
    var spy = sinon.spy(DefaultContactsCustomizer, 'saveContacts');
    MockVariantManager.dispatchCustomizationEvents({
      'foo': {bar: 1}
    });
    assert.equal(spy.callCount, 0);
    checkMockContacts([]);
  });

  test('saved contacts match what was passed ', function() {
    var spy = sinon.spy(navigator.mozContacts, 'save');
    DefaultContactsCustomizer.saveContacts(contacts);
    checkMockContacts(contacts);
    assert.equal(spy.callCount, 2);
  });
});
