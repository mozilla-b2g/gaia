requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_export_strategy.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');
requireApp('communications/contacts/js/export/contacts_exporter.js');

var realUtils = null;
var realStatus = null;

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
      showMenu: function() {}
    };
    window.status = {
      show: function(msg) {}
    };

  });

  suiteTeardown(function() {
    shouldShowProgressSpy.restore();
    doExportSpy.restore();
    hasDeterminativeProgressSpy.restore();
    setProgressStepSpy.restore();
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
});
