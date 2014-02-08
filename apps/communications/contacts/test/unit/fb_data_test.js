'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/simple_phone_matcher.js');
require('/shared/js/fb/fb_request.js');
requireApp('communications/contacts/js/fb/fb_data.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/test/unit/mocks/mock_moz_phone_number_service.js');

mocha.globals(['SimplePhoneMatcher', 'TelIndexer', 'utils', 'Node']);

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

  function assertRemove(obj) {
    var uid = obj.uid;
    var index = fb.contacts.dsIndex;

    assert.isUndefined(MockDatastore._records[uid]);

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

  function assertNewIndex() {
    assert.equal(Object.keys(MockDatastore._records).length, 1,
                 'Datastore must contain the persisted index');
    var index = fb.contacts.dsIndex;
    // Checking that the stored index is the same as the in memory index
    assert.deepEqual(index, MockDatastore._records[1]);

    assert.equal(Object.keys(index.byTel).length, 0);
  }

  function assertAdded(friend) {
    var uid = friend.uid;

    var index = fb.contacts.dsIndex;

    assert.equal(MockDatastore._records[uid].uid, uid);

    // Testing that all telVariants have been captured in the index
    var mockTelVariants = SimplePhoneMatcher.generateVariants(
                                                          friend.tel[0].value);
    mockTelVariants.forEach(function(aTelVariant) {
      assert.equal(index.byTel[aTelVariant], uid);
    });
  }

  function doRemove(objToRemove, flush, done) {
    var toRemoveUid = objToRemove.uid;
    var toRemoveTel = objToRemove.tel[0].value;

    var saveReq = fb.contacts.save(objToRemove);
    saveReq.onsuccess = function() {
      // Precondition
      assertAdded(objToRemove);
      // It is needed to flush as add does not automatically flush the index
      var flushReq = fb.contacts.flush();
      flushReq.onsuccess = function() {
        var req = fb.contacts.remove(toRemoveUid, flush);
        req.onsuccess = function() {
          if (flush) {
            assert.isUndefined(MockDatastore._records['1'].byTel[toRemoveTel]);
          }
          else {
            assert.equal(MockDatastore._records['1'].byTel[toRemoveTel],
                                                                  toRemoveUid);
          }
          assertRemove(objToRemove);
          done();
        };
      };
      flushReq.onerror = errorNotExpected.bind(flushReq, done);
    };
    saveReq.onerror = errorNotExpected.bind(saveReq, done);
  }

  function errorNotExpected(done) {
    done(function() {
      assert.fail('Error not expected: ' + this.error.name);
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
      assert.fail('Error reported by initialization!');
      done();
    });
  });

  test('Adding to the datastore indexes data correctly', function(done) {
    var req = fb.contacts.save(MockFbFriendData);

    req.onsuccess = function() {
      assertAdded(MockFbFriendData);
      done();
    };

    req.onerror = function() {
      assert.fail('Error while adding: ' + req.error.name);
      done();
    };
  });

  test('Retrieving a FB Friend from the datastore. By tel', function(done) {
    var req = fb.contacts.getByPhone(mockTel);

    req.onsuccess = function() {
      assertFound(req);
      done();
    };

    req.onerror = function() {
      assert.fail('Error while retrieving: ' + req.error.name);
      done();
    };
  });

  test('Retrieving a FB Friend from the datastore. By tel not normalized',
    function(done) {
      var req = fb.contacts.getByPhone('67(67)67-67  6');

      req.onsuccess = function() {
        assertFound(req);
        done();
      };

      req.onerror = function() {
        assert.fail('Error while retrieving: ' + req.error.name);
        done();
      };
  });

  test('Retrieving a FB Friend from the datastore. By uid', function(done) {
    var req = fb.contacts.get(mockUid);

    req.onsuccess = function() {
      assertFound(req);
      done();
    };

    req.onerror = function() {
      assert.fail('Error while retrieving: ' + req.error.name);
      done();
    };
  });

  test('Removing a FB Friend from the datastore. No flush', function(done) {
    var objToRemove = createFbContact('678903', 'Carlos', '+34699999888');

    doRemove(objToRemove, false, done);
  });

  test('Flushing the data', function(done) {
    var req = fb.contacts.flush();

    req.onsuccess = function() {
      // There has been a flush, thus the "persistent" index is up to date
      assert.deepEqual(fb.contacts.dsIndex, MockDatastore._records[1]);
      done();
    };

    req.onerror = function() {
      assert.fail('Error while flushing: ' + req.error.name);
      done();
    };
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

      assert.deepEqual(updatedObj,
                       MockDatastore._records[MockFbFriendData.uid]);

      var telVariants = SimplePhoneMatcher.generateVariants(
                                                    updatedObj.tel[0].value);
      // Testing that all telVariants have been captured in the index
      telVariants.forEach(function(aTelVariant) {
        assert.equal(index.byTel[aTelVariant], MockFbFriendData.uid);
      });

      var telMockVariants = SimplePhoneMatcher.generateVariants(
                                                MockFbFriendData.tel[0].value);
      // Testing that reindexing was ok
      telMockVariants.forEach(function(aTelVariant) {
        assert.isUndefined(index.byTel[aTelVariant]);
      });
      done();
    };

    req.onerror = function() {
      assert.fail('Error while updating: ' + req.error.name);
      done();
    };
  });


  test('Clearing all FB Data', function(done) {
    var clearReq = fb.contacts.clear();

    clearReq.onsuccess = function() {
      assertNewIndex();
      done();
    };
    clearReq.onerror = function() {
      assert.fail('Error while clearing: ' + req.error.name);
      done();
    };
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
    navigator.mozPhoneNumberService = realPhoneNumberService;
  });

});
