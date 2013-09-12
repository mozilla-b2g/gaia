'use strict';

requireApp('communications/ftu/test/unit/mock_navigator_contacts.js');
requireApp('communications/ftu/js/customizers/default_contacts.js');

suite('default contacts >', function() {
  var realMozContacts, realMozSettings, realMozMobileConnection;

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockNavigatorContacts;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
    realMozContacts = null;
  });

  var contacts = [
    {'givenName': ['Foo']},
    {'givenName': ['Bar']},
  ];

  function checkMockContacts(contacts) {
    var mockContacts = MockNavigatorContacts.contacts;
    assert.equal(mockContacts.length, contacts.length);
    for (var i = 0; i < mockContacts.length; ++i) {
      assert.equal(mockContacts[i].givenName[0], contacts[i].givenName[0]);
    }
  }

  test('load contacts using a valid mcc/mnc', function(done) {
    DefaultContacts.saveContacts(contacts);
    checkMockContacts(contacts);
  });
});
