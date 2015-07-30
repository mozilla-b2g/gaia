'use strict';
/* global ContactsService */
/* global MockContactsList */
/* global MockConfirmDialog */
/* global ContactsExporter */
/* global MockExportStrategy */
/* global MockMozContacts */
/* global MockMozL10n */
/* global MocksHelper */
/* global MockLoader */

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_export_strategy.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_loader.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/js/fb/fb_reader_utils.js');

requireApp('communications/contacts/js/export/contacts_exporter.js');

var realUtils = null;
var realStatus = null;
var realLoader = null;
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
  'ConfirmDialog',
  'Loader'
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

    realLoader = window.Loader;
    window.Loader = MockLoader;

    navigator.mozContacts = MockMozContacts;

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
    window.Loader = realLoader;

    MockExportStrategy.shouldShowProgress.restore();
    MockExportStrategy.doExport.restore();
    MockExportStrategy.hasDeterminativeProgress.restore();
    MockExportStrategy.setProgressStep.restore();
    mocksHelperForExporter.suiteTeardown();
  });

  setup(function() {
    this.sinon.stub(ContactsService, 'getAll', function(cb) {
      var contacts = MockContactsList();
      setTimeout(function() {
        cb(null, contacts);
      });
    });
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
      assert.lengthOf(contacts, 2);
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
      sinon.spy(MockConfirmDialog, 'show');
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
      MockConfirmDialog.show.restore();
    });

    test('Error dialog is called', function() {
      assert.ok(MockConfirmDialog.show.calledOnce);
    });

    test('The proper error shows', function() {
      // errors are called with the structure
      // {title, error, retry, cancel}
      assert.equal(MockConfirmDialog.show.args[0][1], errorName);
    });

    test('Status shown', function() {
      assert.isTrue(window.utils.status.show.called);
    });

  });

});
