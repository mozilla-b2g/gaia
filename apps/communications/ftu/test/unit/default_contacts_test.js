'use strict';

requireApp('communications/ftu/test/unit/mock_navigator_contacts.js');
requireApp('communications/ftu/test/unit/mock_variant_manager.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');

requireApp('communications/ftu/js/customizers/default_contacts.js');

suite('default contacts >', function() {
  var realMozContacts, realMozContact;

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

  test('responds to customization event ', function(done) {
    MockVariantManager.dispatchCustomizationEvents({
      'default_contacts': contacts
    });
    setTimeout(function() {
      checkMockContacts(contacts);
      done();
    }, 0);
  });
});
