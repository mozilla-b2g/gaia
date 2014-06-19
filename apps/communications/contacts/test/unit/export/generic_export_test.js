'use strict';
/* global MockContactsList */
/* global MockContacts */
/* global ContactsExporter */
/* global MockExportStrategy */
/* global MockMozContacts */
/* global MockMozL10n */
/* global MocksHelper */

requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_export_strategy.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');

requireApp('communications/contacts/js/export/contacts_exporter.js');

var realUtils = null;
var realStatus = null;
var real_ = null;

if (!window.utils) {
  window.utils = null;
} else {
  realUtils = window.utils;
}

if (!window.status) {
  window.status = null;
} else {
  realStatus = window.status;
}

if (!navigator.mozL10n) {
  navigator.mozL10n = null;
}

if (!window._) {
  window._ = null;
}

var mocksHelperForExporter = new MocksHelper([
  'Contacts',
  'ConfirmDialog'
]).init();

suite('Contacts Exporter', function() {

  var subject;
  var ids = ['1', '3'];
  var realL10n;
  var menuOverlay;

  function getContactsForIds(ids) {
    var contacts = MockContactsList();

    var result = [];

    ids.forEach(function onId(id) {
      for (var i = 0; i < contacts.length; i++) {
        if (contacts[i].id == id) {
          result.push(contacts[i]);
          return;
        }
      }
    });

    return result;
  }

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = navigator.mozL10n.get;

    navigator.mozContacts = MockMozContacts;
    sinon.stub(navigator.mozContacts, 'find', function() {
      return {
        set onsuccess(cb) {
          cb(MockContactsList());
        },
        set onerror(cb) {
        },
        result: MockContactsList()
      };
    });

    sinon.spy(MockExportStrategy, 'shouldShowProgress');
    sinon.spy(MockExportStrategy, 'doExport');
    sinon.spy(MockExportStrategy, 'hasDeterminativeProgress');
    sinon.spy(MockExportStrategy, 'setProgressStep');

    if (!window.utils) {
      window.utils = {};
    }
    window.utils.time = {
      pretty: function(date) {
        return date;
      }
    };
    window.utils.overlay = {
      show: function() {
        return {
          setTotal: function(l) {}
        };
      },
      hide: function() {},
      showMenu: function() {}
    };
    window.utils.status = {
      show: function(msg) {},
      hide: function() {}
    };
    sinon.spy(window.utils.status, 'show');

    mocksHelperForExporter.suiteSetup();

  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;

    MockExportStrategy.shouldShowProgress.restore();
    MockExportStrategy.doExport.restore();
    MockExportStrategy.hasDeterminativeProgress.restore();
    MockExportStrategy.setProgressStep.restore();
    mocksHelperForExporter.suiteTeardown();

  });

  setup(function() {
    menuOverlay = document.createElement('form');
    menuOverlay.innerHTML = '<menu>' +
      '<button data-l10n-id="cancel" id="cancel-overlay">Cancel</button>' +
      '</menu>';
    document.body.appendChild(menuOverlay);

    subject = new ContactsExporter(MockExportStrategy);

    MockExportStrategy.shouldShowProgress.reset();
    MockExportStrategy.doExport.reset();
    MockExportStrategy.hasDeterminativeProgress.reset();
    MockExportStrategy.setProgressStep.reset();
  });

  teardown(function() {
    menuOverlay.parentNode.removeChild(menuOverlay);
  });


  test('Correct initialization given an array of ids', function(done) {
    subject.init(ids, function onInitDone(contacts) {
      var expectedContacts = getContactsForIds(ids);
      assert.length(contacts, 2);
      assert.notStrictEqual(expectedContacts, contacts);
      done();
    });
  });

  suite('Strategy with deterministic progress >', function() {

    setup(function(done) {
      subject.init(ids, function onInitDone(contacts) {
        subject.start();
        done();
      });
    });

    test('Progress bar is shown', function() {
      assert.ok(MockExportStrategy.shouldShowProgress.calledOnce);
    });

    test('Export is attempted', function() {
      assert.ok(MockExportStrategy.doExport.calledOnce);
    });

    test('The progress type is checked', function() {
      assert.ok(MockExportStrategy.hasDeterminativeProgress.calledOnce);
    });

    test('Progress bar updates value', function() {
      assert.ok(MockExportStrategy.setProgressStep.calledOnce);
    });

    test('Status shown', function() {
      assert.isTrue(window.utils.status.show.called);
    });
  });

  suite('Strategy with no deterministic progress >', function() {

    setup(function(done) {
      subject.init(ids, function onInitDone(contacts) {
        MockExportStrategy.determinativeValue = false;
        subject.start();
        done();
      });
    });
    teardown(function() {
      MockExportStrategy.determinativeValue = true;
    });

    test('Progress bar is shown', function() {
      assert.ok(MockExportStrategy.shouldShowProgress.calledOnce);
    });

    test('Export is attempted', function() {
      assert.ok(MockExportStrategy.doExport.calledOnce);
    });

    test('The progress type is checked', function() {
      assert.ok(MockExportStrategy.hasDeterminativeProgress.calledOnce);
    });

    test('Progress bar never updated', function() {
      assert.ok(MockExportStrategy.setProgressStep.callCount === 0);
    });

    test('Status shown', function() {
      assert.isTrue(window.utils.status.show.called);
    });
  });

  suite('Error handling >', function() {
    var error,
        errorName;

    setup(function(done) {
      sinon.spy(MockContacts, 'confirmDialog');
      subject.init(ids, function onInitDone(contacts) {
        error = {
          'reason': 'BIGerror'
        };
        errorName = 'exportError-' +
                        MockExportStrategy.name + '-' +
                        error.reason;
        MockExportStrategy.setError(error);
        subject.start();
        done();
      });
    });
    teardown(function() {
      MockContacts.confirmDialog.restore();
    });

    test('Error dialog is called', function() {
      assert.ok(MockContacts.confirmDialog.calledOnce);
    });

    test('The proper error shows', function() {
      // errors are called with the structure
      // {title, error, retry, cancel}
      assert.equal(MockContacts.confirmDialog.args[0][1], errorName);
    });

    test('Status shown', function() {
      assert.isTrue(window.utils.status.show.called);
    });

  });

});
