/* globals ActivityHandler, ConfirmDialog, MockContactAllFields, MocksHelper,
    MockMozL10n */

'use strict';

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/contacts/js/utilities/misc.js');
requireApp('communications/contacts/js/activities.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_value_selector.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');

if (!window._) {
  window._ = null;
}

if (!window.utils) {
  window.utils = null;
}

var mocksHelperForActivities = new MocksHelper([
  'Contacts',
  'ConfirmDialog',
  'LazyLoader'
]).init();

suite('Test Activities', function() {
  var realMozL10n,
      real_,
      realImport;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = navigator.mozL10n.get;

    if (!window.utils) {
      window.utils = {};
    }

    window.utils.overlay = {
      show: function() {},
      hide: function() {}
    };

    window.utils.importedID = null;
    realImport = window.utils.importFromVcard;
    window.utils.importFromVcard = function(file, callback) {
      callback(this.importedID);
    };
    mocksHelperForActivities.suiteSetup();
  });
  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window._ = real_;
    window.utils.importFromVcard = realImport;
    mocksHelperForActivities.suiteTeardown();
  });

  suite('Activity launching', function() {
    setup(function() {
      ActivityHandler._currentActivity = null;
      ActivityHandler._launchedAsInlineActivity = false;
      window.utils.importedID = null;
      document.location.hash = '';
    });

    test('New contact', function() {
      var activity = {
        source: {
          name: 'new',
          data: {}
        }
      };
      ActivityHandler.handle(activity);
      assert.include(document.location.hash, 'view-contact-form');
      assert.equal(ActivityHandler._currentActivity, activity);
    });

    test('Open contact', function() {
      var activity = {
        source: {
          name: 'open',
          data: {}
        }
      };
      ActivityHandler.handle(activity);
      assert.include(document.location.hash, 'view-contact-details');
      assert.equal(ActivityHandler._currentActivity, activity);
    });

    test('Update contact', function() {
      var activity = {
        source: {
          name: 'update',
          data: {}
        }
      };
      ActivityHandler.handle(activity);
      assert.include(document.location.hash, 'add-parameters');
      assert.equal(ActivityHandler._currentActivity, activity);
    });

    test('Pick contact', function() {
      ActivityHandler._launchedAsInlineActivity = true;
      var activity = {
        source: {
          name: 'pick',
          data: {}
        }
      };
      ActivityHandler.handle(activity);
      assert.equal(ActivityHandler._currentActivity, activity);
    });

    test('Import one contact from vcard (open details)', function() {
      var activity = {
        source: {
          name: 'import',
          data: {
            blob: 'blob'
          }
        }
      };
      window.utils.importedID = '1';
      ActivityHandler.handle(activity);
      assert.equal(ActivityHandler._currentActivity, activity);
      assert.include(document.location.hash, 'view-contact-details');
      assert.include(document.location.hash, 'id=1');
    });

    test('Import vcard to open list (multiple contacts)', function() {
      var activity = {
        source: {
          name: 'import',
          data: {
            blob: 'blob'
          }
        }
      };
      ActivityHandler.handle(activity);
      assert.equal(ActivityHandler._currentActivity, activity);
      assert.include(document.location.hash, 'view-contact-details');
      assert.equal(document.location.hash.indexOf('id'), -1);
    });
  });

  suite('Pick activity handling', function() {
    var activity,
        contact,
        result;

    setup(function() {
      activity = {
        source: {
          name: 'pick',
          data: {
            type: 'webcontacts/tel'
          }
        },
        postResult: function(response) {
          result = response;
        }
      };
      contact = new MockContactAllFields();
    });

    teardown(function() {
      activity = {};
      contact = {};
      result = {};
      ConfirmDialog.hide();
    });

    test('webcontacts/tel, 0 results', function() {
      activity.source.data.type = 'webcontacts/tel';
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, window._('no_contact_phones'));
    });

     test('webcontacts/tel, 1 result', function() {
      activity.source.data.type = 'webcontacts/tel';
      ActivityHandler._currentActivity = activity;
      // We want to test only with one phone, so erase the last one
      contact.tel.pop();
      // we need to create a object from data to compare prototypes
      // check activities.js > function copyContactData
      var newContact = Object.create(contact);
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      // Check if all the properties are the same
      contact = window.utils.misc.toMozContact(contact);
      for (var prop in contact) {
        if (prop === 'photo' && result[prop] && result[prop][0]) {
          assert.equal(result[prop][0].size, contact[prop][0].size);
          assert.equal(result[prop][0].type, contact[prop][0].type);
        } else {
          assert.equal(JSON.stringify(result[prop]),
                       JSON.stringify(contact[prop]));
        }
      }
    });

   test('webcontacts/tel, many results', function() {
      activity.source.data.type = 'webcontacts/tel';
      ActivityHandler._currentActivity = activity;
      // we need to create a object from data to compare prototypes
      // check activities.js > function copyContactData
      var newContact = Object.create(contact);
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select, so we need
      // to compare to a contact with only the first phone

      // As is filtered, we only retrieve one phone number
      assert.equal(result.tel.length, 1);

      // As the mock of value selector is giving us the first option
      // we ensure that this option is the one filtered as well.
      assert.equal(newContact.tel[0].value, result.tel[0].value);
    });

    test('webcontacts/contact, 0 results', function() {
      activity.source.data.type = 'webcontacts/contact';
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, window._('no_contact_phones'));
    });

    test('webcontacts/contact, 1 result', function() {
      activity.source.data.type = 'webcontacts/contact';
      ActivityHandler._currentActivity = activity;
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(result.number, contact.tel[0].value);
    });

    test('webcontacts/contact, many results', function() {
      activity.source.data.type = 'webcontacts/contact';
      ActivityHandler._currentActivity = activity;
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select
      assert.equal(result.number, contact.tel[0].value);
    });

    test('webcontacts/email, 0 results', function() {
      activity.source.data.type = 'webcontacts/email';
      ActivityHandler._currentActivity = activity;
      contact.email = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, window._('no_contact_email'));
    });

    test('webcontacts/email, 1 result', function() {
      activity.source.data.type = 'webcontacts/email';
      ActivityHandler._currentActivity = activity;
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(result.email, contact.email[0].value);
    });

    test('webcontacts/email, many results', function() {
      activity.source.data.type = 'webcontacts/email';
      ActivityHandler._currentActivity = activity;
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select
      assert.equal(result.email, contact.email[0].value);
    });
  });
});
