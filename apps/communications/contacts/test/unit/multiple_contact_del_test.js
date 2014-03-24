/*jshint node: true, browser: true */
/* globals MockContactsList, MockMozContacts, Mockfb,
MocksHelper, contactsRemover, contacts, MockContactsSettings */

'use strict';

requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/js/contacts_bulk_delete.js');
requireApp('communications/contacts/js/contacts_remover.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/js/views/list.js');
requireApp('communications/contacts/test/unit/mock_contacts_settings.js');

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
  'ConfirmDialog'
]).init();

var subject, fb, real_, realOverlay, realFb, realContacts, realSettings;

suite('Multiple Contacts Delete', function() {
  function getContactIds() {
    var contacts = MockContactsList();
    var result = [];
    for (var i = 0; i < contacts.length; i++) {
      result.push(contacts[i].id);
    }
    return result;
  }

  function createSelectPromise() {
    var promise = {
      canceled: false,
      _selected: [],
      resolved: false,
      successCb: null,
      errorCb: null,
      resolve: function resolve(ids) {
        var self = this;
        setTimeout(function onResolve() {
          if (ids) {
            self._selected = ids;
          }
          self.resolved = true;
          if (self.successCb) {
            self.successCb(self._selected);
          }
        }, 0);
      }
    };
    return promise;
  }

  suiteSetup(function() {
    if (!window.utils) {
      window.utils = {};
    }
    realOverlay = window.utils.overlay;
    window.utils.overlay = {
      total: 0,
      shown: false,
      show: function() {
        this.shown = true;
        return this;
      },
      hide: function() {},
      showMenu: function() {},
      update: function() {},
      setClass: function() {},
      setTotal: function(n) {
        this.total = n;
      },
      setHeaderMsg: function() {}
    };
    realContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
    real_ = window._;
    window._ = navigator.mozL10n.get;
    realFb = fb;
    fb = Mockfb;
    mocksHelperForDelete.suiteSetup();
    realSettings = contacts.Settings;
    contacts.Settings = MockContactsSettings;
  });

  suiteTeardown(function() {
    window._ = real_;
    fb = realFb;
    navigator.mozContacts = realContacts;
    window.utils.overlay = realOverlay;
    mocksHelperForDelete.suiteTeardown();
    contacts.Settings = realSettings;

  });

  setup(function() {
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

  test('Deleting several contact', function(done) {
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

  test('Perform Delete Operation', function(done) {
    var ids = getContactIds();
    var promise = createSelectPromise();
    promise.resolve(ids);
    contacts.BulkDelete.performDelete(promise);
    assert.ok(window.utils.overlay.shown, 'overlay not displayed');
    done();
  });
});
