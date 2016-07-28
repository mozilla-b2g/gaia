/*jshint node: true, browser: true */
/* globals MockContactsList, MockMozContacts, Mockfb, MockLoader, utils,
MocksHelper, contactsRemover, contacts, MockContactsSettings */

'use strict';

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/js/contacts_bulk_delete.js');
requireApp('communications/contacts/js/contacts_remover.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
requireApp('communications/contacts/js/views/list.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');
requireApp('communications/contacts/test/unit/mock_loader.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');

/* jshint ignore:start */
if (!this._) {
  this._ = null;
}

if (!this.utils) {
  this.utils = null;
}
/* jshint ignore:end */

var mocksHelperForDelete = new MocksHelper([
  'Contacts',
  'ConfirmDialog',
  'mozContact'
]).init();

var subject, fb, real_, realFb, realContacts, realSettings,
    realLoader;

suite('Multiple Contacts Delete', function() {
  function getContactIds() {
    var contacts = MockContactsList();
    var result = [];
    for (var i = 0; i < contacts.length; i++) {
      result.push(contacts[i].id);
    }
    return result;
  }

  suiteSetup(function() {
    if (!window.utils) {
      window.utils = {};
    }
    realContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
    realLoader = window.Loader;
    window.Loader = MockLoader;
    real_ = window._;
    window._ = navigator.mozL10n.get;
    realFb = fb;
    fb = Mockfb;
    mocksHelperForDelete.suiteSetup();
    realSettings = contacts.Settings;
    contacts.Settings = MockContactsSettings;
    window.utils.misc = {
      toMozContact: function() {}
    };
  });

  suiteTeardown(function() {
    window._ = real_;
    fb = realFb;
    navigator.mozContacts = realContacts;
    window.Loader = realLoader;
    mocksHelperForDelete.suiteTeardown();
    contacts.Settings = realSettings;
    delete window.utils.misc;
  });

  setup(function() {
    this.sinon.stub(utils.misc, 'toMozContact');
    subject = new contactsRemover();
  });

  test('Correct initialization given an array of ids', function(done) {
    var ids = getContactIds();
    subject.init(ids, function onInitDone() {
      assert.ok(ids, 'Invalid initialization');
      done();
    });
  });

  test('Deleting 1 contact', function(done) {
    var allIds = getContactIds();
    var ids = [allIds[0]];
    subject.init(ids, function onInitDone() {
      subject.start();
      subject.onError = function onError() {
        assert.ok(!ids, 'Error Deleting contacts');
      };
      subject.onFinished = function onFinished() {
        assert.ok(ids, 'Finished Deleting contacts');
        done();
      };
      assert.ok(ids, 'No Contact to delete');
    });
  });

  test('Deleting several contacts', function(done) {
    var ids = getContactIds();
    subject.init(ids, function onInitDone() {
      subject.start();
      assert.ok(ids, 'No Contact to delete');
    });
    subject.onError = function onError() {
      assert.ok(!ids, 'Error Deleting contacts');
    };
    subject.onFinished = function onFinished() {
      assert.ok(ids, 'Finished Deleting contacts');
      done();
    };
    assert.ok(ids, 'No Contact to delete');
  });

  test('Deleting several contacts, one of them FB Contact', function(done) {
    var ids = getContactIds();
    Mockfb._fbData = [
      MockContactsList()[0]
    ];

    subject.init(ids, function onInitDone() {
      subject.start();
      assert.ok(ids, 'No Contact to delete');
    });
    subject.onError = function onError() {
      assert.ok(!ids, 'Error Deleting contacts');
    };
    subject.onFinished = function onFinished() {
      assert.ok(ids, 'Finished Deleting contacts');
      done();
    };
    assert.ok(ids, 'No Contact to delete');
  });
});
