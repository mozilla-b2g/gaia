'use strict';

suite('ApnList', function() {
  var FAKE_APN_LIST_KEY = 'fakeKey';

  var map = {
    '*': {
      'modules/async_storage': 'MockAsyncStorage',
      'modules/apn/apn_utils': 'MockApnUtils'
    }
  };
  var modules = [
    'modules/apn/apn_list',
    'modules/apn/apn_item',
    'modules/async_storage',
    'modules/apn/apn_utils'
  ];

  setup(function(done) {
    var that = this;
    var requireCtx = testRequire([], map, function() {});

    this.mockAsyncStorage = {};
    define('MockAsyncStorage', function() {
      return {
        setItem: function() {
          return Promise.resolve();
        },
        getItem: function(key) {
          return Promise.resolve(that.mockAsyncStorage[key]);
        }
      };
    });

    define('MockApnUtils', function() {
      return {
        generateId: function() {},
        clone: function() {}
      };
    });

    requireCtx(modules,
      function(ApnList, ApnItem, MockAsyncStorage, MockApnUtils) {
        this.ApnList = ApnList;
        this.ApnItem = ApnItem;
        this.MockAsyncStorage = MockAsyncStorage;
        this.MockApnUtils = MockApnUtils;

        // Create mock apn items.
        this.mockApnItems = [
          {
            id: '0',
            category: 'category0'
          },
          {
            id: '1',
            category: 'category1'
          }
        ];
        this.apnList = new this.ApnList(FAKE_APN_LIST_KEY);
        this.mockAsyncStorage = {};
        this.mockAsyncStorage[FAKE_APN_LIST_KEY] = this.mockApnItems;

        done();
    }.bind(this));
  });

  suite('_add', function() {
    test('add with category specified', function(done) {
      var apn = {};
      var category = 'category';
      var randomId = 'randomId';

      this.mockAsyncStorage = {};
      this.sinon.stub(this.MockApnUtils, 'generateId', function() {
        return randomId;
      });

      this.apnList._add(apn, category)
      .then(function(apnId) {
        var addedApnItem = this.apnList._apnItems[0];
        assert.deepEqual(addedApnItem.apn, apn);
        assert.equal(addedApnItem.id, randomId);
        assert.equal(addedApnItem.category, category);
        assert.equal(apnId, randomId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('add without category specified', function(done) {
      var apn = {};
      var randomId = 'randomId';

      this.mockAsyncStorage = {};
      this.sinon.stub(this.MockApnUtils, 'generateId', function() {
        return randomId;
      });

      this.apnList._add(apn)
      .then(function(apnId) {
        var addedApnItem = this.apnList._apnItems[0];
        assert.deepEqual(addedApnItem.apn, apn);
        assert.equal(addedApnItem.id, randomId);
        assert.equal(addedApnItem.category, this.ApnItem.APN_CATEGORY.CUSTOM);
        assert.equal(apnId, randomId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_remove', function() {
    test('no existing apn items', function(done) {
      this.mockAsyncStorage = {};

      this.apnList._remove('000')
      .then(function() {
        // Should not resolve.
        assert.isTrue(false);
      }.bind(this), function(err) {
        assert.equal(err, 'no apn items');
      }).then(done, done);
    });

    test('remove with valid id', function(done) {
      var removedApnId = this.mockApnItems[0].id;

      this.apnList._remove(removedApnId)
      .then(function() {
        assert.ok(!this.apnList._apnItems.some(
          (apnItem) => apnItem.id === removedApnId));
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('remove with invalid id', function(done) {
      var removedApnId = 'invalidId';

      this.apnList._remove(removedApnId)
      .then(function() {
        // Should not resolve.
        assert.isTrue(false);
      }.bind(this), function(err) {
        assert.equal(err, 'apn not found');
      }).then(done, done);
    });
  });

  suite('_update', function() {
    test('no existing apn items', function(done) {
      this.mockAsyncStorage = {};

      this.apnList._update('000', {})
      .then(function() {
        // Should not resolve.
        assert.isTrue(false);
      }.bind(this), function(err) {
        assert.equal(err, 'no apn items');
      }).then(done, done);
    });

    test('update with valid id', function(done) {
      var updatedApnId = this.mockApnItems[0].id;
      var apn = {
        fakeKey: 'fakeValue'
      };

      this.apnList._update(updatedApnId, apn)
      .then(function() {
        assert.equal(this.apnList._apnItems[0].apn.fakeKey, apn.fakeKey);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('update with invalid id', function(done) {
      var updatedApnId = 'invalidId';

      this.apnList._update(updatedApnId, {})
      .then(function() {
        // Should not resolve.
        assert.isTrue(false);
      }.bind(this), function(err) {
        assert.equal(err, 'apn not found');
      }).then(done, done);
    });
  });

  suite('items', function() {
    test('with cached apn items', function(done) {
      var that = this;
      this.apnList._apnItems = this.mockApnItems;

      this.apnList.items()
      .then(function(result) {
        assert.equal(result, that.mockApnItems);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('without cached apn items', function(done) {
      var that = this;
      this.apnList._apnItems = null;
      this.mockAsyncStorage = {};
      this.mockAsyncStorage[FAKE_APN_LIST_KEY] = this.mockApnItems;

      this.apnList.items()
      .then(function(apnItems) {
        apnItems.forEach(function(apnItem, index) {
          var mockApnItem = that.mockApnItems[index];
          assert.equal(apnItem.id, mockApnItem.id);
          assert.equal(apnItem.category, mockApnItem.category);
          assert.equal(apnItem.apn, mockApnItem);
        });
        assert.equal(apnItems, that.apnList._apnItems);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('item', function() {
    test('without id specified', function(done) {
      this.apnList.item()
      .then(function(apnItem) {
        assert.isNull(apnItem);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('without existing apn items', function(done) {
      this.mockAsyncStorage = {};
      this.apnList.item('1')
      .then(function(apnItem) {
        assert.isNull(apnItem);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('with existing apn items', function(done) {
      this.apnList._apnItems = this.mockApnItems;

      this.apnList.item('1')
      .then(function(apnItem) {
        assert.equal(apnItem.id, '1');
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('add', function(done) {
    test('should call to _schedule and _add correctly', function() {
      var apn = {};
      var category = 'category';
      var apnClone = {};
      this.sinon.stub(this.MockApnUtils, 'clone', function() {
        return apnClone;
      });
      this.sinon.stub(this.apnList, '_add', function() {
        return Promise.resolve();
      });
      this.sinon.spy(this.apnList, '_schedule');

      this.apnList.add(apn, category)
      .then(function() {
        sinon.assert.calledWith(this.MockApnUtils.clone, apn);
        sinon.assert.called(this.apnList._schedule);
        sinon.assert.calledWith(this.apnList._add, apnClone, category);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('remove', function(done) {
    test('should call to _schedule and _remove correctly', function() {
      var apnId = '000';
      this.sinon.stub(this.apnList, '_remove', function() {
        return Promise.resolve();
      });
      this.sinon.spy(this.apnList, '_schedule');

      this.apnList.remove(apnId)
      .then(function() {
        sinon.assert.called(this.apnList._schedule);
        sinon.assert.calledWith(this.apnList._remove, apnId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('update', function(done) {
    test('should call to _schedule and _update correctly', function() {
      var apnId = '000';
      var apn = {};
      var apnClone = {};
      this.sinon.stub(this.MockApnUtils, 'clone', function() {
        return apnClone;
      });
      this.sinon.stub(this.apnList, '_update', function() {
        return Promise.resolve();
      });
      this.sinon.spy(this.apnList, '_schedule');

      this.apnList.update(apnId, apn)
      .then(function() {
        sinon.assert.calledWith(this.MockApnUtils.clone, apn);
        sinon.assert.called(this.apnList._schedule);
        sinon.assert.calledWith(this.apnList._update, apnClone, apnId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
