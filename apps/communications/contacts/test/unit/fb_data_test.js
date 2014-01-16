require('/shared/js/lazy_loader.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/fb/fb_request.js');
requireApp('communications/contacts/js/fb/fb_data.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/test/unit/mocks/mock_moz_phone_number_service.js');

mocha.globals(['SimplePhoneMatcher', 'TelIndexer']);
mocha.timeout(10000);

var realDatastore, realPhoneNumberService;

if (!this.realDatastore) {
  this.realDatastore = null;
}

if (!this.realPhoneNumberService) {
  this.realPhoneNumberService = null;
}

suite('Facebook datastore suite', function() {
  var mockUid = '456789';
  var mockTel = '+34676767676';

  function createFbContact(uid, name, tel) {
    return {
      uid: uid,
      name: [name],
      tel: [{
          type: ['other'],
          value: tel
        }
      ]
    };
  }

  var MockFbFriendData = createFbContact(mockUid, 'Jose Manuel', mockTel);

  function assertRemove(obj, oldDsId) {
    var uid = obj.uid;
    var index = fb.contacts.dsIndex;

    // Here checking the status of the "in memory" index
    assert.isUndefined(index.byUid[uid]);
    assert.isUndefined(MockDatastore._records[oldDsId]);

    var variants = SimplePhoneMatcher.generateVariants(obj.tel[0].value);

    variants.forEach(function(aTelVariant) {
      assert.isUndefined(index.byTel[aTelVariant]);
    });
  }

  function assertFound(req) {
    var res = req.result;
    assert.isNotNull(res);
    assert.equal(res.uid, mockUid);
  }

  function assertNotFound(req) {
    var res = req.result;
    assert.isNull(res);
  }

  function assertNewIndex() {
    assert.equal(Object.keys(MockDatastore._records).length, 1,
                 'Datastore must contain the persisted index');
    var index = fb.contacts.dsIndex;
    // Checking that the stored index is the same as the in memory index
    assert.deepEqual(index, MockDatastore._records[1]);

    assert.equal(Object.keys(index.byTel).length, 0);
    assert.equal(Object.keys(index.byUid).length, 0);
  }

  function assertAdded(friend) {
    var uid = friend.uid;

    var index = fb.contacts.dsIndex;
    var friendDsId = index.byUid[uid];
    assert.isDefined(friendDsId);

    assert.equal(MockDatastore._records[friendDsId].uid, uid);

    // Testing that all telVariants have been captured in the index
    var mockTelVariants = SimplePhoneMatcher.generateVariants(
                                                          friend.tel[0].value);
    mockTelVariants.forEach(function(aTelVariant) {
      assert.equal(index.byTel[aTelVariant], friendDsId);
    });
  }

  function doRemove(objToRemove, flush, done) {
    var toRemoveUid = objToRemove.uid;

    var saveReq = fb.contacts.save(objToRemove);
    saveReq.onsuccess = function() {
      // Precondition
      assertAdded(objToRemove);
      var friendDsId = fb.contacts.dsIndex.byUid[toRemoveUid];
      var req = fb.contacts.remove(toRemoveUid, flush);
      req.onsuccess = function() {
        if (flush === false) {
          // There has not been flush
          // thus the "persistent" index is out of date
          assert.equal(MockDatastore._records['1'].byUid[toRemoveUid],
                                                                  friendDsId);
        }
        else {
          assert.isUndefined(MockDatastore._records['1'].byUid[toRemoveUid]);
        }
        assertRemove(objToRemove, friendDsId);
        done();
      };
      req.onerror = errorNotExpected.bind(req, done);
    };
    saveReq.onerror = errorNotExpected.bind(saveReq, done);
  }

  function errorNotExpected(done) {
    done(function() {
      assert.fail('Error not expected: ' + this.error.name);
    });
  }

  function successNotExpected(done) {
    done(function() {
      assert.fail('Succcess not expected');
    });
  }

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    MockNavigatorDatastore._records = {};

    realPhoneNumberService = navigator.mozPhoneNumberService;
    navigator.mozPhoneNumberService = MockPhoneNumberService;
  });


  test('Initialization phase and index creation', function(done) {
    fb.contacts.init(function() {
      // When initialized index must be created
      assertNewIndex();
      // Testing that the DS is correctly assigned
      assert.equal(MockDatastore.name, fb.contacts.datastore.name);
      done();
    }, function(err) {
        done(function() {
          assert.fail('Error reported by initialization!: ' + err);
        });
    });
  });

  test('Adding to the datastore indexes data correctly', function(done) {
    var req = fb.contacts.save(MockFbFriendData);

    req.onsuccess = function() {
      assertAdded(MockFbFriendData);
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Adding to the datastore an existing obj raises error', function(done) {
    var req = fb.contacts.save(MockFbFriendData);

    req.onsuccess = successNotExpected.bind(null, done);

    req.onerror = function() {
      assert.equal(req.error.name, fb.contacts.ALREADY_EXISTS);
      done();
    };
  });

  test('Retrieving a FB Friend from the datastore. By tel', function(done) {
    var req = fb.contacts.getByPhone(mockTel);

    req.onsuccess = function() {
      assertFound(req);
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Retrieving a FB Friend from the datastore. By tel not normalized',
    function(done) {
      var req = fb.contacts.getByPhone('67(67)67-67  6');

      req.onsuccess = function() {
        assertFound(req);
        done();
      };

      req.onerror = errorNotExpected.bind(req, done);
  });

  test('Retrieving a FB Friend from the datastore. By tel. Not found',
    function(done) {
      var req = fb.contacts.getByPhone('987654321');

      req.onsuccess = function() {
        assertNotFound(req);
        done();
      };

      req.onerror = errorNotExpected.bind(req, done);
  });


  test('Retrieving a FB Friend from the datastore. By uid', function(done) {
    var req = fb.contacts.get(mockUid);

    req.onsuccess = function() {
      assertFound(req);
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Retrieving a FB Friend from the datastore by UID. Not found',
       function(done) {
    var req = fb.contacts.get('hhhhh');

    req.onsuccess = function() {
      assertNotFound(req);
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Removing a FB Friend from the datastore. No flush', function(done) {
    var objToRemove = createFbContact('678903', 'Carlos', '+34699999888');

    doRemove(objToRemove, false, done);
  });

  test('Removing a FB Friend from the datastore. Not Found', function(done) {
    var objToRemove = createFbContact('99999', 'Carlos', '+34699999888');

    var req = fb.contacts.remove(objToRemove);

    req.onsuccess = successNotExpected.bind(null, done);

    req.onerror = function() {
      assert.equal(req.error.name, fb.contacts.UID_NOT_FOUND);
      done();
    };
  });

  test('Flushing the data', function(done) {
    var req = fb.contacts.flush();

    req.onsuccess = function() {
      // There has been a flush, thus the "persistent" index is up to date
      assert.deepEqual(fb.contacts.dsIndex, MockDatastore._records[1]);
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Removing a FB Friend from the datastore. Flush', function(done) {
    var objToRemove = createFbContact('999999', 'Pedro', '+34611789654');

    doRemove(objToRemove, true, done);
  });

  test('Updating a FB friend from the datastore', function(done) {
    var updatedObj = createFbContact(MockFbFriendData.uid,
                                     MockFbFriendData.name, '+34657890876');

    var req = fb.contacts.update(updatedObj);

    req.onsuccess = function() {
      var index = fb.contacts.dsIndex;

      // Let's check that the object persisted on the DB
      var dsId = index.byUid[updatedObj.uid];
      assert.deepEqual(updatedObj, MockDatastore._records[dsId]);

      var telVariants = SimplePhoneMatcher.generateVariants(
                                                    updatedObj.tel[0].value);
      // Testing that all telVariants have been captured in the index
      telVariants.forEach(function(aTelVariant) {
        assert.equal(index.byTel[aTelVariant], dsId);
      });

      var telMockVariants = SimplePhoneMatcher.generateVariants(
                                                MockFbFriendData.tel[0].value);
      // Testing that reindexing was ok
      telMockVariants.forEach(function(aTelVariant) {
        assert.isUndefined(index.byTel[aTelVariant]);
      });
      done();
    };

    req.onerror = errorNotExpected.bind(req, done);
  });

  test('Updating a FB friend from the datastore. UID does not exist',
    function(done) {
      var updatedObj = createFbContact('9999',
                                       MockFbFriendData.name, '+34657890876');

      var req = fb.contacts.update(updatedObj);

      successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UIDNotFound');
        done();
      };
  });

  test('Clearing all FB Data', function(done) {
    var clearReq = fb.contacts.clear();

    clearReq.onsuccess = function() {
      assertNewIndex();
      done();
    };
    clearReq.onerror = errorNotExpected.bind(clearReq, done);
  });

  test('If datastore is not found error is reported correctly', function(done) {
    MockNavigatorDatastore._notFound = true;
    MockDatastore._inError = false;
    fb.contacts.restart();

    fb.contacts.init(successNotExpected.bind(null, done),
      function(err) {
        assert.equal(err.name, 'DatastoreNotFound');
        done();
      });
  });

  test('Retrieving a FB Friend from the datastore by UID. DS is in Error',
    function(done) {
      MockNavigatorDatastore._notFound = false;
      MockDatastore._inError = true;
      fb.contacts.restart();

      var req = fb.contacts.get('hhhhh');

      req.onsuccess = successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UnknownError');
        done();
      };
  });

  test('Retrieving a FB Friend from the datastore by tel. DS is in Error',
    function(done) {
      MockNavigatorDatastore._notFound = false;
      MockDatastore._inError = true;

      var req = fb.contacts.getByPhone('hhhhh');

      req.onsuccess = successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UnknownError');
        done();
      };
  });

  test('Adding a FB Friend to the Datastore. DS is in Error',
    function(done) {
      MockNavigatorDatastore._notFound = false;
      MockDatastore._inError = true;

      var req = fb.contacts.save(MockFbFriendData);

      req.onsuccess = successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UnknownError');
        done();
      };
  });

  test('Updating a FB Friend to the Datastore. DS is in Error',
    function(done) {
      MockNavigatorDatastore._notFound = false;
      MockDatastore._inError = true;

      var req = fb.contacts.update({});

      req.onsuccess = successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UnknownError');
        done();
      };
  });

  test('Removing a FB Friend from the Datastore. DS is in Error',
    function(done) {
      MockNavigatorDatastore._notFound = false;
      MockDatastore._inError = true;

      var req = fb.contacts.remove('45678');

      req.onsuccess = successNotExpected.bind(null, done);

      req.onerror = function() {
        assert.equal(req.error.name, 'UnknownError');
        done();
      };
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
    navigator.mozPhoneNumberService = realPhoneNumberService;
  });

});
