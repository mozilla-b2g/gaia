'use strict';

suite('HomescreenItem', function() {
  var modules = [
    'unit/mock_apps_cache',
    'panels/root/homescreen_item'
  ];

  var map = {
    '*': {
      'modules/apps_cache': 'unit/mock_apps_cache'
    }
  };

  var mockAppsCache;
  var homescreenItem;

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(MockAppsCache, HomescreenItem) {
      mockAppsCache = MockAppsCache;
      var element = document.createElement('div');
      homescreenItem = HomescreenItem(element);
      done();
    });
  });

  suite('enabled', function() {
    setup(function() {
      this.sinon.stub(mockAppsCache, 'addEventListener');
      this.sinon.stub(mockAppsCache, 'removeEventListener');
      this.sinon.stub(homescreenItem, '_boundToggleHomescreenSection');
    });

    suite('to true', function() {
      setup(function() {
        homescreenItem._itemEnabled = false;
        homescreenItem.enabled = true;
      });

      test('do related works', function() {
        assert.isTrue(homescreenItem._boundToggleHomescreenSection.called); 
        assert.equal(
          mockAppsCache.addEventListener.getCall(0).args[0], 'oninstall');
        assert.equal(
          mockAppsCache.addEventListener.getCall(1).args[0], 'onuninstall');
      });
    });

    suite('to false', function() {
      setup(function() {
        homescreenItem._itemEnabled = true;
        homescreenItem.enabled = false;
      });

      test('do related works', function() {
        assert.equal(
          mockAppsCache.removeEventListener.getCall(0).args[0], 'oninstall');
        assert.equal(
          mockAppsCache.removeEventListener.getCall(1).args[0],
          'onuninstall');
      });
    });
  });

  suite('_updateHomescreenSection', function() {
    suite('1 homescreen', function() {
      setup(function(done) {
        mockAppsCache._apps = [
          { manifest: { role: 'homescreen' } },
          { manifest: { role: 'system' } }
        ];
        homescreenItem._updateHomescreenSection().then(done, done);
      });

      test('will hide menuItem', function() {
        assert.isTrue(homescreenItem._element.hidden); 
      });
    });

    suite('2 homescreens', function() {
      setup(function(done) {
        mockAppsCache._apps = [
          { manifest: { role: 'homescreen' } },
          { manifest: { role: 'homescreen' } },
          { manifest: { role: 'system' } }
        ];
        homescreenItem._updateHomescreenSection().then(done, done);
      });

      test('will show menuItem', function() {
        assert.isFalse(homescreenItem._element.hidden); 
      });
    });
  });

  suite('_getHomescreenApps', function() {
    var testApps = [
      { manifest: { role: 'homescreen' } },
      { manifest: { role: 'homescreen' } },
      { manifest: { role: 'homescreen' } },
      { manifest: { role: 'system' } }
    ];

    test('we can get right apps', function() {
      assert.equal(homescreenItem._getHomescreenApps(testApps).length, 3);
    });
  });
});
