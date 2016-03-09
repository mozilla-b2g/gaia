/* global MockNavigatorSettings */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('SpatialNavigationHelper', function() {
  const SN_ENABLE_KEY = 'settings-app.spatial-navigation.enabled';
  var mockLazyLoader;
  var mockSpatialNavigation, realSpatialNavigation;
  var realMozSettings;

  suiteSetup(function(done) {
    testRequire([
      'shared_mocks/mock_lazy_loader',
      'modules/spatial_navigation_helper',
      'unit/mock_spatial_navigation'
    ], (function(MockLazyLoader, spatialNavigationFunc, MockSpatialNavigation) {
      this.spatialNavigation = spatialNavigationFunc;
      mockSpatialNavigation = MockSpatialNavigation;
      mockLazyLoader = MockLazyLoader;

      realMozSettings = window.navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;
      done();
    }).bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  suite('Basic functions', function() {
    var spySNMakeFocusable, spySNFocus;
    setup(function() {
      realSpatialNavigation = window.SpatialNavigation;
      window.SpatialNavigation = mockSpatialNavigation;
      window.LazyLoader = mockLazyLoader;
      spySNMakeFocusable =
        this.sinon.spy(window.SpatialNavigation, 'makeFocusable');
      spySNFocus =
        this.sinon.spy(window.SpatialNavigation, 'focus');
    });

    teardown(function() {
      window.SpatialNavigation = realSpatialNavigation;
      document.getElementsByTagName('body')[0]
        .classList.remove('spatial-navigation');
    });

    test('init() with SN enabled', function(done) {
      window.navigator.mozSettings.mSettings[SN_ENABLE_KEY] = true;
      window.SpatialNavigationHelper.init().then(() => {
        assert.isTrue(spySNMakeFocusable.calledOnce);
        assert.isTrue(spySNFocus.calledOnce);
        assert.isTrue(document.getElementsByTagName('body')[0].classList.
          contains('spatial-navigation'));
        done();
      });
    });

    test('init() with SN disabled', function(done) {
      window.navigator.mozSettings.mSettings[SN_ENABLE_KEY] = false;
      window.SpatialNavigationHelper.init().then(() => {
        assert.isFalse(spySNMakeFocusable.called);
        assert.isFalse(spySNFocus.called);
        assert.isFalse(document.getElementsByTagName('body')[0].classList.
          contains('spatial-navigation'));
        done();
      });
    });
  });
});
