requireApp('communications/contacts/js/export/sim.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');

suite('Sim export', function() {
  var realMozContacts = null;
  var c1 = {}, c2 = {};
  var progressMock = function dummy() {};

  var iccContactId = '1234567';
  var iccid = '999999999';

  function getIccContactUrl(iccid, iccContactId) {
    return 'urn:uuid:' + iccid + '-' + iccContactId;
  }

  function setupManagerAndSubject(toExport) {
    var iccManager = new IccManager();
    var updateSpy = sinon.spy(iccManager, 'updateContact');
    var subject = new ContactsSIMExport(iccManager);
    subject.setProgressStep(progressMock);
    subject.setContactsToExport(toExport);

    return {
      subject: subject,
      manager: iccManager,
      updateSpy: updateSpy
    };
  }

  function IccManager() {
    this.calledCount = 0,
    this.faulty = false,
    this.simFull = false,
    this.updateContact = function(type, contact) {
      var self = this;
      return {
        result: {
          id: iccContactId
        },
        set onsuccess(cb) {
          self.calledCount++;
          if ((!self.faulty && !self.simFull) || self.calledCount % 2 != 0) {
            window.setTimeout(cb);
          }
        },
        set onerror(cb) {
          if (self.faulty && self.calledCount % 2 == 0) {
            this.error = {
              name: 'ContactTypeNotSupported'
            };
            window.setTimeout(function() {
              cb({
                  target: this
              });
            }.bind(this));
            return;
          }
          if (self.simFull && self.calledCount % 2 == 0) {
            this.error = {
              name: 'NoFreeRecordFound'
            };
            window.setTimeout(function() {
              cb({
                  target: this
              });
            }.bind(this));
          }
        }
      };
    };

    this.iccInfo = {
      iccid: iccid
    };
  }

  var iccContactIdUrl = {
    type: ['source', 'sim'],
    value: getIccContactUrl(iccid, iccContactId)
  };

  suiteSetup(function() {
    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;
  });

  suiteTeardown(function() {
    navigator.mozContacts = realMozContacts;
  });

  test('Calling with 1 contact', function(done) {
    var obj = setupManagerAndSubject([c1]);

    obj.subject.doExport(function onFinish(error, exported) {
      assert.equal(false, obj.subject.hasDeterminativeProgress());
      assert.ok(obj.updateSpy.calledOnce);
      assert.isNull(error);
      assert.equal(1, exported);
      done();
    });
  });

  test('Calling with several contacts', function(done) {
    var contacts = [c1, c2];
    var obj = setupManagerAndSubject(contacts);

    obj.subject.doExport(function onFinish(error, exported) {
      assert.ok(obj.subject.hasDeterminativeProgress());
      assert.equal(contacts.length, obj.updateSpy.callCount);
      assert.isNull(error);
      assert.equal(contacts.length, exported);
      done();
    });
  });

  test('If SIM Card is full the error is reported properly', function(done) {
    var contacts = [c1, c2];

   var obj = setupManagerAndSubject(contacts);
   obj.manager.simFull = true;

    obj.subject.doExport(function onFinish(error, exported, recoverable) {
      assert.ok(obj.subject.hasDeterminativeProgress());
      assert.equal(error.reason, 'NoFreeRecordFound');
      assert.equal(recoverable, false);
      assert.equal(1, exported);
      done();
    });
  });

  test('Recovering from error updating in IccManager', function(done) {
    var contacts = [c1, c2, c1, c2];
    var obj = setupManagerAndSubject(contacts);

    obj.manager.faulty = true;

    obj.subject.doExport(function onFinish(error, exported) {
      assert.ok(obj.subject.hasDeterminativeProgress());
      assert.equal(contacts.length, obj.updateSpy.callCount);
      // We do not have an error
      assert.isNull(error);
      // The number of exported contacts is not the total
      assert.equal(contacts.length / 2, exported);
      done();
    });
  });

  test('Updating a Contact that has not a previous iccContactId. URL created',
       function(done) {
    var obj = setupManagerAndSubject([c1]);

    obj.subject.doExport(function onFinish(error, exported) {
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
    var obj = setupManagerAndSubject([contactToExport]);

    obj.subject.doExport(function onFinish(error, exported) {
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

    var obj = setupManagerAndSubject([contactToExport]);

    obj.subject.doExport(function onFinish(error, exported) {
      assert.equal(contactToExport.url.length, 2);
      assert.deepEqual(contactToExport.url[0], contactToExportOriginalUrl);
      assert.deepEqual(contactToExport.url[1], iccContactIdUrl);
      done();
    });
  });
});
