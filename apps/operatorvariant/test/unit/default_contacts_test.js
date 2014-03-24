/* global requireApp, suite, suiteSetup, MockNavigatorContacts,
   MockMozContact, sinon, suiteTeardown, setup, test, defaultContactsCustomizer,
   assert*/

'use strict';

requireApp('operatorvariant/test/unit/mock_mozContact.js');
requireApp('operatorvariant/test/unit/mock_navigator_contacts.js');
requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/default_contacts_customizer.js');

var mozContact;
suite('Default contacts customizer >', function() {
  var realMozContacts, saveContactSpy;
  var contactsMockup = [
    {'givenName': ['Foo']},
    {'givenName': ['Bar']}
  ];

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockNavigatorContacts;
    mozContact = MockMozContact;
    saveContactSpy = sinon.spy(MockNavigatorContacts, 'save');
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
    realMozContacts = null;
    mozContact = null;
    saveContactSpy.restore();
  });

  setup(function() {
    saveContactSpy.reset();
  });

  test(' set ', function() {
    defaultContactsCustomizer.set(contactsMockup);
    // As contactsMockup has 2 contacts, this method
    // should be called twice
    assert.equal(saveContactSpy.callCount, contactsMockup.length);
  });
});
