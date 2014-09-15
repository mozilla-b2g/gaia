'use strict';

suite('ApnSettingsManager', function() {
  var map = {
    '*': {
      'modules/apn/apn_settings': 'MockApnSettings',
      'modules/apn/apn_selections': 'MockApnSelections',
      'modules/apn/apn_utils': 'MockApnUtils',
      'modules/apn/apn_list': 'MockApnList'
    }
  };
  var modules = [
    'modules/apn/apn_settings_manager',
    'modules/apn/apn_item',
    'modules/apn/apn_utils',
    'modules/apn/apn_const',
    'modules/apn/apn_list'
  ];

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    var MockApnSettings = function() {
      return {
        getAll: function() {},
        get: function() {},
        update: function() {}
      };
    };
    define('MockApnSettings', function() {
      return MockApnSettings;
    });

    var MockApnSelections = function() {
      return {
        get: function() {}
      };
    };
    define('MockApnSelections', function() {
      return MockApnSelections;
    });

    define('MockApnList', function() {
      return sinon.spy(function() {
        var apnList = {
          get: function() {}
        };
        return apnList;
      });
    });

    define('MockApnUtils', function() {
      return {
        getOperatorCode: function() {},
        apnTypeFilter: function() {},
        getEuApns: function() {},
        getDefaultApns: function() {},
        getCpApns: function() {},
        generateId: function() {},
        separateApnsByType: function() {},
        isMatchedApn: function() {},
        sortByCategory: function() {},
        clone: function() {}
      };
    });

    requireCtx(modules,
      function(ApnSettingsManager, ApnItem, MockApnUtils, MockApnConst,
        MockApnList) {
          this.ApnSettingsManager = ApnSettingsManager;
          this.ApnItem = ApnItem;
          this.MockApnUtils = MockApnUtils;
          this.MockApnConst = MockApnConst;
          this.MockApnList = MockApnList;
          done();
    }.bind(this));
  });

  suite('_deriveActiveApnIdFromItems', function() {
    var FAKE_APN_ID = '000';
    var mockApnItems = [];

    setup(function() {
      this.sinon.spy(this.MockApnUtils, 'sortByCategory');
      this.sinon.stub(this.ApnSettingsManager, '_apnItems', function() {
        return Promise.resolve(mockApnItems);
      });
    });

    test('called with apn items', function(done) {
      var that = this;
      var serviceId = 0;
      var apnType = 'default';

      mockApnItems = [{ id: FAKE_APN_ID }, {}, {}];
      this.ApnSettingsManager._deriveActiveApnIdFromItems(serviceId, apnType)
      .then(function(activeApnId) {
        // Ensure the apn items are queried with correct parameters.
        sinon.assert.calledWith(
          that.ApnSettingsManager._apnItems, serviceId, apnType);
        // Ensure the list is sorted.
        sinon.assert.called(that.MockApnUtils.sortByCategory);
        // Ensure the id is of the first apn item.
        assert.equal(activeApnId, FAKE_APN_ID);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('called without apn items', function(done) {
      mockApnItems = [];
      this.ApnSettingsManager._deriveActiveApnIdFromItems(0, 'default')
      .then(function(activeApnId) {
        assert.equal(activeApnId, null);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_deriveActiveApnIdFromSettings', function() {
    var FAKE_PROP_NAME = 'fakePropName';
    var FAKE_PROP = 'fakeProp';
    var MATCHED_APN_ID = '000';

    var mockApnItems = [];
    var mockApnItemInSettings = {};

    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      this.sinon.stub(this.ApnSettingsManager, '_apnItems', function() {
        return Promise.resolve(mockApnItems);
      });
      this.sinon.stub(this.ApnSettingsManager._apnSettings, 'get', function() {
        return Promise.resolve(mockApnItemInSettings);
      });
      this.sinon.stub(this.MockApnUtils, 'isMatchedApn', function(apn1, apn2) {
        return apn1[FAKE_PROP_NAME] === apn2[FAKE_PROP_NAME];
      });
    });

    teardown(function() {
      mockApnItems = [];
      mockApnItemInSettings = {};
    });

    test('should query current apn items and settings database with correct ' +
      'parameters', function() {
        var that = this;

        this.ApnSettingsManager
        ._deriveActiveApnIdFromSettings(serviceId, apnType)
        .then(function() {
          sinon.assert.calledWith(that.ApnSettingsManager._apnItems, serviceId,
            apnType);
          sinon.assert.calledWith(that.ApnSettingsManager._apnSettings.get,
            serviceId, apnType);
        });
    });

    test('called with matched apn item', function(done) {
      var generateFakeApnItems = function(prop) {
        var apn = {};
        apn[FAKE_PROP_NAME] = prop;
        return { apn: apn };
      };

      var targetApnItems = generateFakeApnItems(FAKE_PROP);
      targetApnItems.id = MATCHED_APN_ID;
      mockApnItems = [1, 2, 3].map((id) => generateFakeApnItems(id));
      mockApnItems.push(targetApnItems);

      mockApnItemInSettings[FAKE_PROP_NAME] = FAKE_PROP;

      this.ApnSettingsManager._deriveActiveApnIdFromSettings(serviceId, apnType)
      .then(function(matchedApnId) {
        // Ensure the id of the matched apn is returned.
        assert.equal(matchedApnId, MATCHED_APN_ID);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('called without matched apn item', function(done) {
      var that = this;

      this.sinon.stub(this.ApnSettingsManager, 'addApn', function() {
        return MATCHED_APN_ID;
      });

      this.ApnSettingsManager._deriveActiveApnIdFromSettings(serviceId, apnType)
      .then(function(matchedApnId) {
        // Ensure the existing apn is added.
        sinon.assert.calledWith(
          that.ApnSettingsManager.addApn, serviceId, mockApnItemInSettings);
        // Ensure the id of the newly created apn is returned.
        assert.equal(matchedApnId, MATCHED_APN_ID);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('called without apn settings', function(done) {
      mockApnItemInSettings = null;

      this.ApnSettingsManager._deriveActiveApnIdFromSettings(serviceId, apnType)
      .then(function(matchedApnId) {
        // Should return null.
        assert.equal(matchedApnId, null);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_getApnAppliedType', function() {
    var mockApnSelections = {};
    var serviceId = 0;

    setup(function() {
      this.sinon.stub(this.ApnSettingsManager._apnSelections, 'get',
        function() {
          return Promise.resolve(mockApnSelections);
      });
    });

    teardown(function() {
      mockApnSelections = {};
    });

    test('called with matched active apn item', function(done) {
      var ACTIVE_APN_ID = 'active_apn_id';
      mockApnSelections = {
        'default': ACTIVE_APN_ID,
        'mms': 'mms_id'
      };

      this.ApnSettingsManager._getApnAppliedType(serviceId, ACTIVE_APN_ID)
      .then(function(appliedType) {
        assert.equal(appliedType, 'default');
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('called without matched active apn item', function(done) {
      mockApnSelections = {
        'default': 'default_id',
        'mms': 'mms_id'
      };

      this.ApnSettingsManager._getApnAppliedType(serviceId, 'fake_id')
      .then(function(appliedType) {
        assert.equal(appliedType, null);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_storeApnSettingByType', function() {
    var FAKE_APN_ID = '000';
    var mockApnSelections = {};
    var mockApnItem = { id: FAKE_APN_ID, apn: { id: FAKE_APN_ID }};

    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      this.sinon.spy(this.ApnSettingsManager._apnSettings, 'update');
      this.sinon.stub(this.ApnSettingsManager._apnSelections, 'get',
        function() {
          return Promise.resolve(mockApnSelections);
      });
      this.sinon.stub(this.ApnSettingsManager, '_apnList', function() {
        return {
          item: function(apnId) {
            return Promise.resolve(apnId === FAKE_APN_ID ? mockApnItem : null);
          }
        };
      });
    });

    teardown(function() {
      mockApnSelections = {};
    });

    test('called with an existing apn item', function(done) {
      var that = this;
      mockApnSelections[apnType] = FAKE_APN_ID;

      this.ApnSettingsManager._storeApnSettingByType(serviceId, apnType)
      .then(function() {
        // Ensure _apnSettings.update is called correctly
        sinon.assert.calledWith(that.ApnSettingsManager._apnSettings.update,
          serviceId, apnType, mockApnItem.apn);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('called without apn items', function(done) {
      var that = this;
      mockApnSelections[apnType] = null;

      this.ApnSettingsManager._storeApnSettingByType(serviceId, apnType)
      .then(function() {
        // Ensure _apnSettings.update is called correctly
        sinon.assert.calledWith(that.ApnSettingsManager._apnSettings.update,
          serviceId, apnType, null);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_apnList', function() {
    var serviceId = 0;

    test('called without existing apn list', function() {
      var apnList = this.ApnSettingsManager._apnList(serviceId);
      sinon.assert.calledWith(
        this.MockApnList, this.MockApnConst.APN_LIST_KEY + serviceId);
      assert.equal(apnList, this.ApnSettingsManager._apnLists[serviceId]);
    });

    test('called with existing apn list', function() {
      var fakeApnList = {};
      this.ApnSettingsManager._apnLists[serviceId] = fakeApnList;

      this.ApnSettingsManager._apnList(serviceId);
      sinon.assert.notCalled(this.MockApnList);
    });
  });

  suite('_apnItems', function() {
    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      var that = this;
      this.sinon.stub(this.MockApnUtils, 'apnTypeFilter').returns(true);
      this.fakeApnItems = [{}, {}, {}];
      this.fakeApnList = {
        items: function() {
          return Promise.resolve(that.fakeApnItems);
        }
      };
      this.ApnSettingsManager._apnLists[serviceId] = this.fakeApnList;
    });

    test('called with existing apn items', function(done) {
      var that = this;

      this.ApnSettingsManager._apnItems(serviceId, apnType)
      .then(function(apnItems) {
        sinon.assert.calledWith(that.MockApnUtils.apnTypeFilter, apnType);
        sinon.assert.callCount(that.MockApnUtils.apnTypeFilter,
          that.fakeApnItems.length);
        assert.deepEqual(apnItems, that.fakeApnItems);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('_restoreApnItemsOfCategory', function() {
    var serviceId = 0;

    var APNS_FOR_RESTORING;

    setup(function() {
      var FAKE_APN_ITEMS = [
        { id: 1, category: this.ApnItem.APN_CATEGORY.PRESET },
        { id: 2, category: this.ApnItem.APN_CATEGORY.CUSTOM },
        { id: 3, category: this.ApnItem.APN_CATEGORY.PRESET },
        { id: 4, category: this.ApnItem.APN_CATEGORY.PRESET }
      ];

      APNS_FOR_RESTORING = [
        {apn: 1, types: ['default']},
        {apn: 2, types: ['supl']}
      ];

      this.fakeApnList = {
        items: function() {
          return Promise.resolve(FAKE_APN_ITEMS);
        },
        remove: this.sinon.spy(),
        add: this.sinon.spy()
      };
      this.ApnSettingsManager._apnLists[serviceId] = this.fakeApnList;
    });

    test('should remove the original preset apn items', function(done) {
      var that = this;

      this.ApnSettingsManager._restoreApnItemsOfCategory(this.fakeApnList,
        APNS_FOR_RESTORING, this.ApnItem.APN_CATEGORY.PRESET)
      .then(function() {
        assert.ok(that.fakeApnList.remove.getCall(0).calledWith(1));
        assert.ok(that.fakeApnList.remove.getCall(1).calledWith(3));
        assert.ok(that.fakeApnList.remove.getCall(2).calledWith(4));
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should add the new preset apn items', function(done) {
      var that = this;

      this.ApnSettingsManager._restoreApnItemsOfCategory(this.fakeApnList,
        APNS_FOR_RESTORING, this.ApnItem.APN_CATEGORY.PRESET)
      .then(function() {
        assert.ok(that.fakeApnList.add.getCall(0)
          .calledWith(APNS_FOR_RESTORING[0],
            that.ApnItem.APN_CATEGORY.PRESET));
        assert.ok(that.fakeApnList.add.getCall(1)
          .calledWith(APNS_FOR_RESTORING[1],
            that.ApnItem.APN_CATEGORY.PRESET));
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('restore', function() {
    var FAKE_MCC = '000';
    var FAKE_MNC = '11';

    var EU_APNS = [{
      'carrier': 'EU Internet',
      'apn': 'eu.apn',
      'types': ['default']
    }];
    var DEFAULT_APNS = [
      {apn: 1, types: ['default']},
      {apn: 2, types: ['supl']}
    ];
    var CP_APNS = [
      {apn: 3, types: ['mms']},
      {apn: 4, types: ['ims']}
    ];
    var FAKE_APN_IDS = [0, 1, 2, 3];
    var FAKE_APN_ITEMS;

    var serviceId = 0;

    var realMobileConnections;
    var MockMobileConnections;

    suiteSetup(function() {
      MockMobileConnections = [{
        data: {
          type: 'fakeNetworkType'
        }
      }];
      realMobileConnections = navigator.mozMobileConnections;
      navigator.mozMobileConnections = MockMobileConnections;
    });

    suiteTeardown(function() {
      navigator.mozMobileConnections = realMobileConnections;
    });

    setup(function() {
      this.sinon.stub(this.MockApnUtils, 'getOperatorCode',
        function(serviceId, type) {
          if (type === 'mcc') {
            return Promise.resolve(FAKE_MCC);
          } else if (type === 'mnc') {
            return Promise.resolve(FAKE_MNC);
          }
      });

      this.sinon.stub(this.MockApnUtils, 'getEuApns',
        function() {
          return Promise.resolve(EU_APNS);
      });

      this.sinon.stub(this.MockApnUtils, 'getDefaultApns',
        function(mcc, mnc, networkType) {
          if (mcc === FAKE_MCC && mnc === FAKE_MNC) {
            return Promise.resolve(DEFAULT_APNS);
          }
      });

      this.sinon.stub(this.MockApnUtils, 'getCpApns',
        function(mcc, mnc, networkType) {
          if (mcc === FAKE_MCC && mnc === FAKE_MNC) {
            return Promise.resolve(CP_APNS);
          }
      });

      this.sinon.stub(this.MockApnUtils, 'separateApnsByType',
        function(apns) {
          return apns;
      });

      FAKE_APN_ITEMS = [
        { id: 1, category: this.ApnItem.APN_CATEGORY.PRESET },
        { id: 2, category: this.ApnItem.APN_CATEGORY.CUSTOM },
        { id: 3, category: this.ApnItem.APN_CATEGORY.PRESET },
        { id: 4, category: this.ApnItem.APN_CATEGORY.PRESET }
      ];

      this.fakeApnList = {
        _count: 0,
        items: function() {
          return Promise.resolve(FAKE_APN_ITEMS);
        },
        remove: this.sinon.spy(),
        add: function() {
          var fakeId = FAKE_APN_IDS[this._count];
          this._count++;
          return fakeId;
        }
      };
      this.sinon.spy(this.fakeApnList, 'add');
      this.ApnSettingsManager._apnLists[serviceId] = this.fakeApnList;
      this.sinon.stub(this.ApnSettingsManager, 'setActiveApnId');
      this.sinon.stub(this.ApnSettingsManager, '_restoreApnItemsOfCategory',
        function() {
          return Promise.resolve(FAKE_APN_IDS);
        });
    });

    test('should resotre EU roaming apns', function(done) {
      var that = this;

      this.ApnSettingsManager.restore(serviceId)
      .then(function() {
        sinon.assert.calledWith(
          that.ApnSettingsManager._restoreApnItemsOfCategory,
            that.fakeApnList, EU_APNS, that.ApnItem.APN_CATEGORY.EU);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });


    test('should resotre preset apns', function(done) {
      var that = this;

      this.ApnSettingsManager.restore(serviceId)
      .then(function() {
        var presetApns = DEFAULT_APNS.concat(CP_APNS);
        var restoreStub = that.ApnSettingsManager._restoreApnItemsOfCategory;

        sinon.assert.called(restoreStub);
        assert.equal(restoreStub.args[1][0], that.fakeApnList);
        assert.deepEqual(restoreStub.args[1][1], presetApns);
        assert.equal(restoreStub.args[1][2], that.ApnItem.APN_CATEGORY.PRESET);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should set the preset apn as the active apn', function(done) {
      var that = this;

      this.ApnSettingsManager.restore(serviceId)
      .then(function() {
        // The third parameter, id, is actually the called count of the fake
        // add function of fakeApnList.
        assert.ok(that.ApnSettingsManager.setActiveApnId.getCall(0)
          .calledWith(serviceId, 'default', 0));
        assert.ok(that.ApnSettingsManager.setActiveApnId.getCall(1)
          .calledWith(serviceId, 'supl', 1));
        assert.ok(that.ApnSettingsManager.setActiveApnId.getCall(2)
          .calledWith(serviceId, 'mms', 2));
        assert.ok(that.ApnSettingsManager.setActiveApnId.getCall(3)
          .calledWith(serviceId, 'ims', 3));
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('queryApns', function() {
    var FAKE_ACTIVE_APN_ID = '000';
    var mockApnItems;

    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      mockApnItems = [{ id: '111' }, { id: '222'}, { id: FAKE_ACTIVE_APN_ID }];
      this.sinon.stub(this.ApnSettingsManager, '_apnItems', function() {
        return Promise.resolve(mockApnItems);
      });
      this.sinon.stub(this.ApnSettingsManager, 'setActiveApnId');
    });

    suite('with active apn id', function() {
      setup(function() {
        this.sinon.stub(this.ApnSettingsManager, 'getActiveApnId', function() {
          return Promise.resolve(FAKE_ACTIVE_APN_ID);
        });
        this.sinon.spy(this.ApnSettingsManager,
          '_deriveActiveApnIdFromSettings');
        this.sinon.spy(this.ApnSettingsManager, '_deriveActiveApnIdFromItems');
      });

      test('should return correct apns', function(done) {
        var that = this;

        this.ApnSettingsManager.queryApns(serviceId, apnType)
        .then(function(apnItems) {
          // Ensure the result is the same as the mock apn items.
          apnItems.forEach(function(apnItem, index) {
            var mockApnItem = mockApnItems[index];
            assert.equal(apnItem.id, mockApnItem.id);
            // The active property of the apn item with an id that equals to
            // FAKE_ACTIVE_APN_ID should be true and vice versa.
            assert.ok(apnItem.active === (apnItem.id === FAKE_ACTIVE_APN_ID));
          });

          sinon.assert.notCalled(that.ApnSettingsManager.setActiveApnId);
          sinon.assert.notCalled(
            that.ApnSettingsManager._deriveActiveApnIdFromSettings);
          sinon.assert.notCalled(
            that.ApnSettingsManager._deriveActiveApnIdFromItems);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('without active apn id', function() {
      setup(function() {
        this.sinon.stub(this.ApnSettingsManager, 'getActiveApnId', function() {
          return Promise.resolve(null);
        });
        this.sinon.stub(this.ApnSettingsManager, '_deriveActiveApnIdFromItems',
          function() {
            return Promise.resolve(FAKE_ACTIVE_APN_ID);
        });
      });

      test('with value in ril.data.apnSettings', function(done) {
        var that = this;

        this.sinon.stub(this.ApnSettingsManager,
          '_deriveActiveApnIdFromSettings', function() {
            return Promise.resolve(FAKE_ACTIVE_APN_ID);
        });

        this.ApnSettingsManager.queryApns(serviceId, apnType)
        .then(function() {
          // Should call to _deriveActiveApnIdFromSettings
          sinon.assert.calledWith(
            that.ApnSettingsManager._deriveActiveApnIdFromSettings,
              serviceId, apnType);
          // Should not call to _deriveActiveApnIdFromItems
          sinon.assert.notCalled(
            that.ApnSettingsManager._deriveActiveApnIdFromItems);
          // Should set FAKE_ACTIVE_APN_ID as the active id.
          sinon.assert.calledWith(
            that.ApnSettingsManager.setActiveApnId,
              serviceId, apnType, FAKE_ACTIVE_APN_ID);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });

      test('without value in ril.data.apnSettings', function(done) {
        var that = this;
        this.sinon.stub(this.ApnSettingsManager,
          '_deriveActiveApnIdFromSettings', function() {
            return Promise.resolve(null);
        });

        this.ApnSettingsManager.queryApns(serviceId, apnType)
        .then(function() {
          // Should call to _deriveActiveApnIdFromSettings
          sinon.assert.calledWith(
            that.ApnSettingsManager._deriveActiveApnIdFromSettings,
              serviceId, apnType);
          // Should call to _deriveActiveApnIdFromItems
          sinon.assert.calledWith(
            that.ApnSettingsManager._deriveActiveApnIdFromItems,
              serviceId, apnType);
          // Should set FAKE_ACTIVE_APN_ID as the active id.
          sinon.assert.calledWith(
            that.ApnSettingsManager.setActiveApnId,
              serviceId, apnType, FAKE_ACTIVE_APN_ID);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });

  suite('addApn', function() {
    var serviceId = 0;
    var apn = {};

    var mockApnList;

    setup(function() {
      mockApnList = {
        add: function() {}
      };
      this.sinon.stub(mockApnList, 'add', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.ApnSettingsManager, '_apnList', function() {
        return mockApnList;
      }.bind(this));
    });

    test('get correct apn list', function(done) {
      this.ApnSettingsManager.addApn(serviceId, apn)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._apnList, serviceId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('with category specified', function(done) {
      var fakeCategory = 'fakeCategory';

      this.ApnSettingsManager.addApn(serviceId, apn, fakeCategory)
      .then(function() {
        sinon.assert.calledWith(mockApnList.add, apn, fakeCategory);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('without category specified', function(done) {
      this.ApnSettingsManager.addApn(serviceId, apn)
      .then(function() {
        sinon.assert.calledWith(mockApnList.add, apn,
          this.ApnItem.APN_CATEGORY.CUSTOM);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('removeApn', function() {
    var FAKE_REMOVED_APN_ID = '000';
    var FAKE_NEW_APN_ID = '111';

    var serviceId = 0;
    var appliedApnType = 'default';

    var mockApnList;

    setup(function() {
      mockApnList = {
        remove: function() {}
      };
      this.sinon.stub(mockApnList, 'remove', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.ApnSettingsManager, '_apnList', function() {
        return mockApnList;
      }.bind(this));
      this.sinon.stub(this.ApnSettingsManager, '_getApnAppliedType',
        function() {
          return Promise.resolve(appliedApnType);
      });
      this.sinon.stub(this.ApnSettingsManager, '_deriveActiveApnIdFromItems',
        function() {
          return Promise.resolve(FAKE_NEW_APN_ID);
      });
      this.sinon.stub(this.ApnSettingsManager, 'setActiveApnId', function() {
        return Promise.resolve();
      });
    });

    test('get correct apn list', function(done) {
      this.ApnSettingsManager.removeApn(serviceId, FAKE_REMOVED_APN_ID)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._apnList, serviceId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('do remove the apn', function(done) {
      this.ApnSettingsManager.removeApn(serviceId, FAKE_REMOVED_APN_ID)
      .then(function() {
        sinon.assert.calledWith(mockApnList.remove, FAKE_REMOVED_APN_ID);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('when the removed apn is actively being used', function(done) {
      this.ApnSettingsManager.removeApn(serviceId, FAKE_REMOVED_APN_ID)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._getApnAppliedType,
          serviceId, FAKE_REMOVED_APN_ID);
        sinon.assert.calledWith(
          this.ApnSettingsManager._deriveActiveApnIdFromItems,
            serviceId, appliedApnType);
        sinon.assert.calledWith(this.ApnSettingsManager.setActiveApnId,
          serviceId, appliedApnType, FAKE_NEW_APN_ID);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('when the removed apn is not actively being used', function(done) {
      this.ApnSettingsManager._getApnAppliedType.restore();
      this.sinon.stub(this.ApnSettingsManager, '_getApnAppliedType',
        function() {
          return Promise.resolve(null);
      });

      this.ApnSettingsManager.removeApn(serviceId, FAKE_REMOVED_APN_ID)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._getApnAppliedType,
          serviceId, FAKE_REMOVED_APN_ID);
        sinon.assert.notCalled(
          this.ApnSettingsManager._deriveActiveApnIdFromItems);
        sinon.assert.notCalled(this.ApnSettingsManager.setActiveApnId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('updateApn', function() {
    var FAKE_UPDATED_APN_ID = '000';

    var serviceId = 0;
    var appliedApnType = 'default';
    var apn = {};

    var mockApnList;

    setup(function() {
      mockApnList = {
        update: function() {}
      };
      this.sinon.stub(mockApnList, 'update', function() {
        return Promise.resolve();
      });
      this.sinon.stub(this.ApnSettingsManager, '_apnList', function() {
        return mockApnList;
      }.bind(this));
      this.sinon.stub(this.ApnSettingsManager, '_getApnAppliedType',
        function() {
          return Promise.resolve(appliedApnType);
      });
      this.sinon.stub(this.ApnSettingsManager, '_storeApnSettingByType',
        function() {
          return Promise.resolve();
      });
    });

    test('get correct apn list', function(done) {
      this.ApnSettingsManager.updateApn(serviceId, FAKE_UPDATED_APN_ID, apn)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._apnList, serviceId);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('do update the apn', function(done) {
      this.ApnSettingsManager.updateApn(serviceId, FAKE_UPDATED_APN_ID, apn)
      .then(function() {
        sinon.assert.calledWith(mockApnList.update, FAKE_UPDATED_APN_ID, apn);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('when the updated apn is actively being used', function(done) {
      this.ApnSettingsManager.updateApn(serviceId, FAKE_UPDATED_APN_ID, apn)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._getApnAppliedType,
          serviceId, FAKE_UPDATED_APN_ID);
        sinon.assert.calledWith(this.ApnSettingsManager._storeApnSettingByType,
          serviceId, appliedApnType);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('when the removed apn is not actively being used', function(done) {
      this.ApnSettingsManager._getApnAppliedType.restore();
      this.sinon.stub(this.ApnSettingsManager, '_getApnAppliedType',
        function() {
          return Promise.resolve(null);
      });

      this.ApnSettingsManager.updateApn(serviceId, FAKE_UPDATED_APN_ID, apn)
      .then(function() {
        sinon.assert.calledWith(this.ApnSettingsManager._getApnAppliedType,
          serviceId, FAKE_UPDATED_APN_ID);
        sinon.assert.notCalled(this.ApnSettingsManager._storeApnSettingByType);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('getActiveApnId', function() {
    var FAKE_ACTIVE_APN_ID = '000';
    var mockApnSelections = {};

    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      this.sinon.stub(this.ApnSettingsManager._apnSelections, 'get',
        function() {
          return Promise.resolve(mockApnSelections);
      });
    });

    test('apnSelections is available', function(done) {
      mockApnSelections[apnType] = FAKE_ACTIVE_APN_ID;
      this.ApnSettingsManager.getActiveApnId(serviceId, apnType)
      .then(function(result) {
        assert.ok(result === FAKE_ACTIVE_APN_ID);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    suite('apnSelections is not available', function() {
      test('no apnSelections object', function(done) {
        mockApnSelections = null;
        this.ApnSettingsManager.getActiveApnId(serviceId, apnType)
        .then(function(result) {
          assert.ok(result == null);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });

      test('no seleciont for the specified apnType', function(done) {
        mockApnSelections = {
          'anotherType': FAKE_ACTIVE_APN_ID
        };
        this.ApnSettingsManager.getActiveApnId(serviceId, apnType)
        .then(function(result) {
          assert.ok(result == null);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });

  suite('setActiveApnId', function() {
    var FAKE_ACTIVE_APN_ID = '000';
    var NEW_ACTIVE_APN_ID = '111';
    var mockApnSelections = {};

    var serviceId = 0;
    var apnType = 'default';

    setup(function() {
      mockApnSelections = {};
      mockApnSelections[apnType] = FAKE_ACTIVE_APN_ID;
      this.sinon.stub(this.ApnSettingsManager._apnSelections, 'get',
        function() {
          return Promise.resolve(mockApnSelections);
      });
      this.sinon.stub(this.ApnSettingsManager, '_storeApnSettingByType',
        function() {
          return Promise.resolve();
      });
    });

    test('the new apn id is different to the original id', function(done) {
      this.ApnSettingsManager.setActiveApnId(serviceId, apnType,
        NEW_ACTIVE_APN_ID)
      .then(function() {
        assert.equal(mockApnSelections[apnType], NEW_ACTIVE_APN_ID);
        sinon.assert.calledWith(this.ApnSettingsManager._storeApnSettingByType,
          serviceId, apnType);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('the new apn id is the same as the original id', function(done) {
      mockApnSelections[apnType] = FAKE_ACTIVE_APN_ID;

      this.ApnSettingsManager.setActiveApnId(serviceId, apnType,
        FAKE_ACTIVE_APN_ID)
      .then(function() {
        assert.equal(mockApnSelections[apnType], FAKE_ACTIVE_APN_ID);
        sinon.assert.notCalled(this.ApnSettingsManager._storeApnSettingByType);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
