'use strict';

suite('ApnSelections', function() {
  var map = {
    '*': {
      'modules/settings_cache': 'MockSettingsCache'
    }
  };
  var modules = [
    'modules/apn/apn_selections',
    'modules/apn/apn_const',
    'modules/settings_cache'
  ];

  var realMozSettings;
  var mockMozSettings;
  var realMobileConnections;
  var mockMobileConnections;

  function createMockApnSelections(apnTypes) {
    var mockApnSelections = [];
    function addMockApnSelection(apnType, i) {
      mockApnSelection[apnType] = apnType + '_' + i + '_id';
    }

    for (var i = 0; i < mockMobileConnections.length; i++) {
      var mockApnSelection = {};

      apnTypes.forEach(addMockApnSelection);
      mockApnSelections.push(mockApnSelection);
    }
    return mockApnSelections;
  }

  suiteSetup(function() {
    mockMozSettings = {
      createLock: function() {
        return {
          set: function() {
            var obj = {};
            setTimeout(function() {
              obj.onsuccess();
            });
            return obj;
          }
        };
      }
    };
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = mockMozSettings;

    mockMobileConnections = [{}, {}];
    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = mockMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozMobileConnections = realMobileConnections;
  });

  setup(function(done) {
    var that = this;
    var requireCtx = testRequire([], map, function() {});

    this.mockSettingsDB = {};
    define('MockSettingsCache', function() {
      return {
        getSettings: function(callback) {
          callback(that.mockSettingsDB);
        }
      };
    });

    requireCtx(modules,
      function(ApnSelections, ApnConst, MockSettingsCache) {
        this.ApnSelections = ApnSelections;
        this.ApnConst = ApnConst;
        this.MockSettingsCache = MockSettingsCache;
        done();
    }.bind(this));
  });

  suite('get', function() {
    setup(function() {
      this.apnSelections = new this.ApnSelections();
      this.mockApnSelections = createMockApnSelections(this.ApnConst.APN_TYPES);
      this.mockSettingsDB[this.ApnConst.APN_SELECTIONS_KEY] =
        this.mockApnSelections;
    });

    test('should get correct apn selections', function(done) {
      var isTheSameSelection = (function(selection1, selection2) {
        return this.ApnConst.APN_TYPES.every(function(apnType) {
          return selection1[apnType] === selection2[apnType];
        });
      }).bind(this);

      var promises = [];
      for (var i = 0; i < mockMobileConnections.length; i++) {
        promises.push(this.apnSelections.get(i));
      }
      Promise.all(promises).then(function(results) {
        results.forEach(function(result, index) {
          assert.ok(isTheSameSelection(result, this.mockApnSelections[index]));
        }, this);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should get empty apn selections when apn selections is unavailable',
      function(done) {
        this.mockSettingsDB[this.ApnConst.APN_SELECTIONS_KEY] = null;
        var isEmptySelection = (function(selection) {
          return this.ApnConst.APN_TYPES.every(function(apnType) {
            return selection[apnType] == null;
          });
        }).bind(this);

        var promises = [];
        for (var i = 0; i < mockMobileConnections.length; i++) {
          promises.push(this.apnSelections.get(i));
        }
        Promise.all(promises).then(function(results) {
          results.forEach(function(result) {
            assert.ok(isEmptySelection(result));
          }, this);
        }.bind(this), function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
    });

    test('should commit when the selection is changed', function(done) {
      var FAKE_ACTIVE_APN_ID = '000';
      this.sinon.spy(this.apnSelections, '_commit');

      this.apnSelections.get(0).then(function(apnSelection) {
        apnSelection['default'] = FAKE_ACTIVE_APN_ID;
        sinon.assert.called(this.apnSelections._commit);
      }.bind(this), function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
