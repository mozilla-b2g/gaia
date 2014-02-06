'use strict';

requireApp('communications/contacts/js/utilities/contact_fields.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');

suite('Contact fields test', function() {
  var realMozL10n,
      contacts,
      contact1,
      contact2,
      contact3;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    contacts = MockContactsList();
  });

  setup(function() {
    contacts = MockContactsList();
    contact1 = contacts[0];
    contact2 = contacts[1];
    contact3 = contacts[2];
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  test('Create Name', function() {

    assert.equal(utils.contactFields.createName(contact1), 'Pepito AD');
    assert.equal(utils.contactFields.createName(contact2), 'Pepito BA');
    assert.equal(utils.contactFields.createName(contact3), 'Antonio CC');

    contact2.givenName = null;
    assert.equal(utils.contactFields.createName(contact2), 'BA');

    contact2.givenName = ['Pepe  Luis'];
    assert.equal(utils.contactFields.createName(contact2), 'Pepe  Luis BA');

    contact2.familyName = null;
    assert.equal(utils.contactFields.createName(contact2), 'Pepe  Luis');

    contact2.givenName = null;
    assert.isNull(utils.contactFields.createName(contact2));

  });

  test('Create Name Field', function() {

    assert.ok(Array.isArray(utils.contactFields.createNameField(contact1)));
    assert.ok(Array.isArray(utils.contactFields.createNameField(contact2)));
    assert.ok(Array.isArray(utils.contactFields.createNameField(contact3)));

    assert.equal(utils.contactFields.createNameField(contact1)[0],
                 'Pepito AD');
    assert.equal(utils.contactFields.createNameField(contact2)[0],
                 'Pepito BA');
    assert.equal(utils.contactFields.createNameField(contact3)[0],
                 'Antonio CC');

  });

  test('Has name', function() {

      assert.ok(utils.contactFields.hasName(contact1));
      assert.ok(utils.contactFields.hasName(contact2));
      assert.ok(utils.contactFields.hasName(contact3));
  });

  test('Get display name', function() {

    var displayNameContact = utils.contactFields.getDisplayName(contact1);
    assert.equal('Pepito AD', displayNameContact.displayName);
    assert.equal(displayNameContact.derivedFrom[0], 'givenName');
    assert.equal(displayNameContact.derivedFrom[1], 'familyName');

    contact2.givenName = null;
    contact2.familyName = null;
    displayNameContact = utils.contactFields.getDisplayName(contact2);
    assert.equal(displayNameContact.displayName, 'Pepito BA');
    assert.equal(displayNameContact.derivedFrom[0], 'name');

    contact2.name = null;
    displayNameContact = utils.contactFields.getDisplayName(contact2);
    assert.equal(displayNameContact.displayName, 'Test');
    assert.equal(displayNameContact.derivedFrom[0], 'org');

    contact2.org = null;
    displayNameContact = utils.contactFields.getDisplayName(contact2);
    assert.equal('+346578888882', displayNameContact.displayName);
    assert.equal(displayNameContact.derivedFrom[0], 'tel');

    contact2.tel = null;
    displayNameContact = utils.contactFields.getDisplayName(contact2);
    assert.equal(displayNameContact.displayName, 'test@test.com');
    assert.equal(displayNameContact.derivedFrom[0], 'email');

    contact2.email = null;
    displayNameContact = utils.contactFields.getDisplayName(contact2);
    assert.equal(displayNameContact.displayName, 'noName');
    assert.isUndefined(displayNameContact.derivedFrom[0]);

  });

});
