/* globals ActivityHandler, ConfirmDialog,
           MockContactAllFields, MocksHelper, MockMozL10n
 */

'use strict';

require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contact2vcard.js');
require('/shared/js/text_normalizer.js');
require('/shared/js/setImmediate.js');

requireApp('communications/contacts/test/unit/mock_header_ui.js');
requireApp('communications/contacts/js/activities.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_main_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_action_menu.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');

if (!window._) {
  window._ = null;
}

if (!window.utils) {
  window.utils = null;
}

var mocksHelperForActivities = new MocksHelper([
  'MainNavigation',
  'Contacts',
  'ConfirmDialog',
  'LazyLoader',
  'mozContact',
  'HeaderUI'
]).init();

suite('Test Activities', function() {
  var realMozL10n,
      real_,
      realImport;

  mocksHelperForActivities.attachTestHelpers();

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

    window.utils.importedCount = null;
    window.utils.importedID = null;
    realImport = window.utils.importFromVcard;
    window.utils.importFromVcard = function(file, callback) {
      callback(this.importedCount, this.importedID);
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window._ = real_;
    window.utils.importFromVcard = realImport;
  });

  function assertIsOpened(activity, viewName) {
    ActivityHandler.handle(activity);
    assert.include(document.location.hash, viewName);
    assert.equal(ActivityHandler._currentActivity, activity);
  }

  suite('Activity launching', function() {
    setup(function() {
      ActivityHandler._currentActivity = null;
      ActivityHandler._launchedAsInlineActivity = false;
      window.utils.importedID = null;
      document.location.hash = '';

      this.sinon.spy(ActivityHandler, 'isCancelable');
    });

    test('New contact', function() {
      var activity = {
        source: {
          name: 'new',
          data: {}
        }
      };
      assertIsOpened(activity, 'view-contact-form');
    });

    test('Open contact', function() {
      var activity = {
        source: {
          name: 'open',
          data: {}
        }
      };
      assertIsOpened(activity, 'view-contact-details');
    });

    test('Open text/vcard with allowSave', function() {
      var activity = {
        source: {
          name: 'open',
          data: {
            type: ['text/vcard'],
            allowSave: true
          }
        }
      };
      assertIsOpened(activity, 'view-contact-details');
    });

    test('Open vCard with deprecated text/directory datatype', function() {
      var activity = {
        source: {
          name: 'open',
          data: {
            type: ['text/directory']
          }
        }
      };
      assertIsOpened(activity, 'view-contact-details');
    });

    test('Open vCard with deprecated text/x-vcard datatype', function() {
      var activity = {
        source: {
          name: 'open',
          data: {
            type: ['text/x-vcard']
          }
        }
      };
      assertIsOpened(activity, 'view-contact-details');
    });

    test('Update contact', function() {
      var activity = {
        source: {
          name: 'update',
          data: {}
        }
      };
      assertIsOpened(activity, 'add-parameters');
      assert.isTrue(ActivityHandler.isCancelable.called,
                                            'checks for activity UI specifics');
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
      assert.isTrue(ActivityHandler.isCancelable.called,
                                            'checks for activity UI specifics');
      assert.equal(ActivityHandler._currentActivity, activity);
    });

    test('Import one contact', function() {
      var activity = {
        source: {
          name: 'import',
          data: {
            blob: 'blob'
          }
        }
      };
      window.utils.importedCount = 1;
      window.utils.importedID = '1';
      assertIsOpened(activity, 'view-contact-details');
      assert.include(document.location.hash, 'id=1',
        'with the proper contact id');
    });

    test('Import multiple contacts', function() {
      var activity = {
        source: {
          name: 'import',
          data: {
            blob: 'blob'
          }
        }
      };
      window.utils.importedCount = 2;
      assertIsOpened(activity, 'view-contact-list');
      assert.equal(document.location.hash.indexOf('id'), -1,
        'no contact id as parameter');
      assert.isTrue(ActivityHandler.isCancelable.called,
        'checks for activity UI specifics');
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

    test('text/vcard, 1 result', function(done) {
      var vcardActivity = {
        source: {
          name: 'pick',
          data: {
          }
        }
      };
      vcardActivity.source.data.type = 'text/vcard';
      ActivityHandler._currentActivity = vcardActivity;

      var stub = sinon.stub(window, 'ContactToVcardBlob',
                                                      function(aContact, cb) {
        cb(new Blob(['1234567'], {
          type: 'text/vcard'
        }));
      });

      vcardActivity.postResult = function(response) {
        assert.equal(response.name, contact.givenName[0] + '_' +
                      contact.familyName[0] + '.vcf');
        assert.equal(response.blob.type, 'text/vcard');

        stub.restore();

        done();
      };

      ActivityHandler.dataPickHandler(contact);
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
      var newContact = contact;
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
      sinon.stub(window.utils.misc, 'toMozContact',
        function() {return newContact;});
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select, so we need
      // to compare to a contact with only the first phone

      // As is filtered, we only retrieve one phone number
      assert.equal(result.tel.length, 1);

      // As the mock of action menu is giving us the first option
      // we ensure that this option is the one filtered as well.
      assert.equal(newContact.tel[0].value, result.tel[0].value);
      // Restore the function
      window.utils.misc.toMozContact.restore();
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
      contact.tel.pop();
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

    test('webcontacts/contact, returning a Contact', function() {
      activity.source.data.type = 'webcontacts/contact';
      activity.source.data.fullContact = true;
      ActivityHandler._currentActivity = activity;
      contact.tel.pop();
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      assert.deepEqual(result.tel, contact.tel);
      assert.deepEqual(result.email, contact.email);
      assert.equal(result.id, contact.id);
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

    test('webcontacts/select, 0 results', function() {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      contact.email = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, window._('no_contact_data'));
    });

    test('webcontacts/select, 1 results(tel)', function() {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      ActivityHandler._currentActivity = activity;
      contact.tel.pop();
      contact.email = [];
      var newContact = Object.create(contact);
      sinon.stub(window.utils.misc, 'toMozContact',
        function() {return newContact;});
      ActivityHandler.dataPickHandler(newContact);
      contact = window.utils.misc.toMozContact(contact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(JSON.stringify(result.select),
                   JSON.stringify(contact.tel));
      assert.equal(JSON.stringify(result.contact),
                   JSON.stringify(contact));
      window.utils.misc.toMozContact.restore();
    });

    test('webcontacts/select, 1 results(email)', function() {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      contact.email.pop();
      var newContact = Object.create(contact);
      sinon.stub(window.utils.misc, 'toMozContact',
        function() {return newContact;});
      ActivityHandler.dataPickHandler(newContact);
      contact = window.utils.misc.toMozContact(contact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(JSON.stringify(result.select),
                   JSON.stringify(contact.email));
      assert.equal(JSON.stringify(result.contact),
                   JSON.stringify(contact));
      window.utils.misc.toMozContact.restore();
    });

    test('webcontacts/select, many results(tel)', function() {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      ActivityHandler._currentActivity = activity;
      contact.email = [];
      var newContact = Object.create(contact);
      sinon.stub(window.utils.misc, 'toMozContact',
        function() {return newContact;});
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(newContact.tel[0].value, result.select[0].value);
      window.utils.misc.toMozContact.restore();
    });

    test('webcontacts/select, many results(email)', function() {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      var newContact = Object.create(contact);
      sinon.stub(window.utils.misc, 'toMozContact',
        function() {return newContact;});
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      assert.equal(newContact.email[0].value, result.select[0].value);
    });
  });

});
