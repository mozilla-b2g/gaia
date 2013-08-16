'use strict';

requireApp('communications/contacts/js/activities.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_contact_all_fields.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_value_selector.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');

if (!this._)
  this._ = null;

var mocksHelperForActivities = new MocksHelper([
  'Contacts',
  'ConfirmDialog'
]).init();

suite('Test Activities', function() {
  var realMozL10n,
      real_;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = navigator.mozL10n.get;

    mocksHelperForActivities.suiteSetup();
  });
  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window._ = real_;
    mocksHelperForActivities.suiteTeardown();
  });

  suite('Activity launching', function() {

    test('New contact', function() {
      var activity = {
        source: {
          name: 'new',
          data: {}
        }
      };
      ActivityHandler.handle(activity);
      assert.equal(document.location.hash, '#view-contact-form');
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
      assert.equal(document.location.hash, '#view-contact-details');
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
      assert.equal(document.location.hash, '#add-parameters');
      assert.equal(ActivityHandler._currentActivity, activity);
    });


    test('Pick contact', function() {
      var activity = {
        source: {
          name: 'pick',
          data: {}
        }
      };
      ActivityHandler.launch_activity(activity, 'pick');
      ActivityHandler.handle(activity);
      assert.equal(ActivityHandler._currentActivity, activity);
    });
  });

  suite('Pick activity handling', function() {
    var activity,
        contact,
        result,
        secondPhone,
        secondEmail;

    setup(function() {
      secondPhone = {
        'type': ['Mobile'],
        'value': '07345124376',
        'carrier': 'O2'
      };
      secondEmail = {
        'type': ['Work'],
        'value': 'work@my-job.com'
      };
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
      assert.equal(ConfirmDialog.text, _('no_phones'));
    });

     test('webcontacts/tel, 1 results', function() {
      activity.source.data.type = 'webcontacts/tel';
      ActivityHandler._currentActivity = activity;
      // we need to create a object from data to compare prototypes
      // check activities.js > function copyContactData
      var newContact = Object.create(contact);
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      for (var prop in contact)
        assert.equal(result[prop], contact[prop]);
    });

   test('webcontacts/tel, many results', function() {
      activity.source.data.type = 'webcontacts/tel';
      ActivityHandler._currentActivity = activity;
      // we need to create a object from data to compare prototypes
      // check activities.js > function copyContactData
      var newContact = Object.create(contact);
      ActivityHandler.dataPickHandler(newContact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select
      for (var prop in contact)
        assert.equal(result[prop], contact[prop]);
    });

    test('webcontacts/contact, 0 results', function() {
      activity.source.data.type = 'webcontacts/contact';
      ActivityHandler._currentActivity = activity;
      contact.tel = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, _('no_phones'));
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
      contact.tel.push(secondPhone);
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select
      assert.equal(result.number.value, contact.tel[0].value);
    });

    test('webcontacts/email, 0 results', function() {
      activity.source.data.type = 'webcontacts/email';
      ActivityHandler._currentActivity = activity;
      contact.email = [];
      ActivityHandler.dataPickHandler(contact);
      assert.isTrue(ConfirmDialog.showing);
      assert.isNull(ConfirmDialog.title);
      assert.equal(ConfirmDialog.text, _('no_email'));
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
      contact.email.push(secondEmail);
      ActivityHandler.dataPickHandler(contact);
      assert.isFalse(ConfirmDialog.showing);
      // Mock returns always the first option from the select
      assert.equal(result.email.value, contact.email[0].value);
    });
  });
});
