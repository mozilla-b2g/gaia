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
  var contacts;

  var shouldShowProgressSpy;
  var doExportSpy;
  var hasDeterminativeProgressSpy;
  var setProgressStepSpy;

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
  };

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

    shouldShowProgressSpy = sinon.spy(MockExportStrategy, 'shouldShowProgress');
    doExportSpy = sinon.spy(MockExportStrategy, 'doExport');
    hasDeterminativeProgressSpy = sinon.spy(MockExportStrategy,
      'hasDeterminativeProgress');
    setProgressStepSpy = sinon.spy(MockExportStrategy, 'setProgressStep');

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

    mocksHelperForExporter.suiteSetup();
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;

    shouldShowProgressSpy.restore();
    doExportSpy.restore();
    hasDeterminativeProgressSpy.restore();
    setProgressStepSpy.restore();
    mocksHelperForExporter.suiteTeardown();
  });

  setup(function() {
    subject = new ContactsExporter(MockExportStrategy);

    shouldShowProgressSpy.reset();
    doExportSpy.reset();
    hasDeterminativeProgressSpy.reset();
    setProgressStepSpy.reset();
  });


  test('Correct initialization given an array of ids', function(done) {
    subject.init(ids, function onInitDone(contacts) {
      var expectedContacts = getContactsForIds(ids);
      assert.length(contacts, 2);
      assert.notStrictEqual(expectedContacts, contacts);
      done();
    });
  });

  test('Strategy with deterministic progress', function(done) {
    subject.init(ids, function onInitDone(contacts) {
      subject.start();

      assert.ok(shouldShowProgressSpy.calledOnce);
      assert.ok(doExportSpy.calledOnce);
      assert.ok(hasDeterminativeProgressSpy.calledOnce);
      assert.ok(setProgressStepSpy.calledOnce);

      done();
    });
  });

  test('Strategy with no deterministic progress', function(done) {
    subject.init(ids, function onInitDone(contacts) {
      MockExportStrategy.determinativeValue = false;
      subject.start();

      assert.ok(shouldShowProgressSpy.calledOnce);
      assert.ok(doExportSpy.calledOnce);
      assert.ok(hasDeterminativeProgressSpy.calledOnce);
      assert.ok(setProgressStepSpy.callCount === 0);

      MockExportStrategy.determinativeValue = true;

      done();
    });
  });

  test('Error handling', function() {
    var errorDialogSpy = sinon.spy(MockContacts, 'confirmDialog');
    subject.init(ids, function onInitDone(contacts) {
      var error = {
        'reason': 'BIGerror'
      };
      var errorName = 'exportError-' +
                      MockExportStrategy.name + '-' +
                      error.reason;
      MockExportStrategy.setError(error);
      subject.start();

      assert.ok(doExportSpy.calledOnce);
      assert.ok(errorDialogSpy.calledOnce);
      // errors are called with the structure
      // {title, error, retry, cancel}
      assert.equal(errorDialogSpy.args[0][1], errorName);
    });
  });

});
