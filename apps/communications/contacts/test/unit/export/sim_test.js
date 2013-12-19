requireApp('communications/contacts/js/export/sim.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');

suite('Sim export', function() {

  var subject;
  var realIcc = null;
  var realMozContacts = null;
  var c1 = {}, c2 = {};
  var updateSpy = null;
  var progressMock = function dummy() {};

  var iccContactId = '1234567';
  var iccid = '999999999';

  function getIccContactUrl(iccid, iccContactId) {
    return 'urn:uuid:' + iccid + '-' + iccContactId;
  }

  var iccContactIdUrl = {
    type: ['source', 'sim'],
    value: getIccContactUrl(iccid, iccContactId)
  };

  suiteSetup(function() {
    realIcc = navigator.mozIccManager;
    // This IccManager, can be set in 'faulty' mode
    // which will make the udpateContact function
    // to fail half of the times called.
    navigator.mozIccManager = {
      'calledCount': 0,
      'faulty': false,
      'updateContact': function(type, contact) {
        var self = this;
        return {
          result: {
            id: iccContactId
          },
          set onsuccess(cb) {
            self.calledCount++;
            if (!self.faulty || self.calledCount % 2 != 0) {
              cb();
            }
          },
          set onerror(cb) {
            if (self.faulty && self.calledCount % 2 == 0) {
              cb();
            }
          }
        };
      },
      'iccInfo': {
        iccid: iccid
      }
    };
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    updateSpy = sinon.spy(navigator.mozIccManager, 'updateContact');
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realIcc;
    navigator.mozContacts = realMozContacts;
  });

  setup(function() {
    subject = new ContactsSIMExport();
    subject.setProgressStep(progressMock);
    updateSpy.reset();
    navigator.mozIccManager.faulty = false;
  });

  test('Calling with 1 contact', function(done) {
    subject.setContactsToExport([c1]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(false, subject.hasDeterminativeProgress());
      assert.ok(updateSpy.calledOnce);
      assert.isNull(error);
      assert.equal(1, exported);
      done();
    });
  });

  test('Calling with several contacts', function(done) {
    var contacts = [c1, c2];
    subject.setContactsToExport(contacts);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.ok(subject.hasDeterminativeProgress());
      assert.equal(contacts.length, updateSpy.callCount);
      assert.isNull(error);
      assert.equal(contacts.length, exported);
      done();
    });
  });

  test('Recovering from error in progress', function(done) {
    var contacts = [c1, c2, c1, c2];
    subject.setContactsToExport(contacts);
    subject.setProgressStep(function faultyProgress() {
      var count = 0;

      var doFaultyProgress = function doFaultyProgress() {
        count++;
        if (count % 2 == 0) {
          throw new Exception('Im a faulty progress');
        }
      };

      return doFaultyProgress();
    }());

    subject.doExport(function onFinish(error, exported, msg) {
      assert.ok(subject.hasDeterminativeProgress());
      assert.equal(contacts.length, updateSpy.callCount);
      // We do have an error this time
      assert.isNotNull(error);
      // The progress fails, but the real process of exporting
      // continues
      assert.equal(contacts.length, exported);
      done();
    });
  });

  test('Recovering from error updating in IccManager', function(done) {
    var contacts = [c1, c2, c1, c2];
    subject.setContactsToExport(contacts);

    navigator.mozIccManager.faulty = true;

    subject.doExport(function onFinish(error, exported, msg) {
      assert.ok(subject.hasDeterminativeProgress());
      assert.equal(contacts.length, updateSpy.callCount);
      // We do not have an error
      assert.isNull(error);
      // The number of exported contacts is not the total
      assert.equal(contacts.length / 2, exported);
      done();
    });
  });

  test('Updating a Contact that has not a previous iccContactId. URL created',
       function(done) {
    subject.setContactsToExport([c1]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.deepEqual(c1.url[0], iccContactIdUrl);
      done();
    });
  });

  test('Updating a Contact that has a previous iccContactId. URL kept as it is',
       function(done) {

    var contactToExport = {
      url: [
        iccContactIdUrl
      ]
    };
    subject.setContactsToExport([contactToExport]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(contactToExport.url.length, 1);
      assert.deepEqual(contactToExport.url[0], iccContactIdUrl);
      done();
    });
  });

  test(
    'Updating a Contact that has a previous iccContactId from a different SIM',
       function(done) {
    var contactToExport = {
      url: [{
        type: ['source', 'sim']
      }]
    };
    contactToExport.url[0].value = getIccContactUrl('98765', '77777');
    var contactToExportOriginalUrl = contactToExport.url[0];

    subject.setContactsToExport([contactToExport]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(contactToExport.url.length, 2);
      assert.deepEqual(contactToExport.url[0], contactToExportOriginalUrl);
      assert.deepEqual(contactToExport.url[1], iccContactIdUrl);
      done();
    });
  });

});
