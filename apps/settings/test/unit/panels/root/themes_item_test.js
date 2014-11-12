/* global MockMozApps */
'use strict';

requireApp('settings/test/unit/mock_moz_apps.js');

suite('ThemesItem', function() {

  var modules = ['panels/root/themes_item'];
  var realMozApps;
  var themesItem;

  suiteSetup(function() {
    realMozApps = window.navigator.mozApps;
  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;
  });

  setup(function(done) {
    window.navigator.mozApps = MockMozApps;
    window.navigator.mozApps.mgmt.addEventListener = this.sinon.spy();
    window.navigator.mozApps.mgmt.removeEventListener = this.sinon.spy();
    var requireCtx = testRequire([], {}, function() {});
    requireCtx(modules, function(ThemesItem) {
      var element = document.createElement('div');
      themesItem = ThemesItem(element);
      done();
    });
  });

  suite('enabled', function() {
    setup(function() {
      themesItem._enabled = false;
      this.sinon.stub(themesItem, '_updateThemeSectionVisibility');
      themesItem.enabled = true;
    });
    test('will call _updateThemeSectionVisibility', function() {
      assert.isTrue(themesItem._updateThemeSectionVisibility.called);
    });
  });

  suite('init', function() {
    setup(function() {
      this.sinon.stub(themesItem, '_updateThemeSectionVisibility');
      // We assumed we did install two theme apps by default
      window.navigator.mozApps.mApps = [
        { manifest: { role: 'theme' } },
        { manifest: { role: 'theme' } },
        { manifest: { role: 'homescreen' } },
      ];
      themesItem.init();
      window.navigator.mozApps.mTriggerGetAllAppsCallback();
    });

    test('we will do related works', function() {
      assert.equal(
        window.navigator.mozApps.mgmt.addEventListener.getCall(0).args[1],
        themesItem._boundUpdateThemes);

      assert.equal(
        window.navigator.mozApps.mgmt.addEventListener.getCall(1).args[1],
        themesItem._boundUpdateThemes);

      assert.isTrue(themesItem._updateThemeSectionVisibility.called);
      assert.equal(themesItem._themeCount, 2);
    });
  });

  suite('_isThemeApp', function() {
    var themeApp = {
      manifest: {
        role: 'theme'
      }
    };

    var homescreenApp = {
      manifest: {
        role: 'homescreen'
      }
    };

    test('we can check whether this is theme app or not', function() {
      assert.isTrue(themesItem._isThemeApp(themeApp));
      assert.isFalse(themesItem._isThemeApp(homescreenApp));
    });
  });

  suite('_updateThemes', function() {
    setup(function() {
      // We assumed we already installed one theme by default
      themesItem._themeCount = 1;
      this.sinon.stub(themesItem, '_updateThemeSectionVisibility');
      this.sinon.stub(themesItem, '_isThemeApp').returns(true);
    });

    suite('received install event', function() {
      setup(function() {
        themesItem._updateThemes({ type : 'install' });
      });

      test('add themeCount and update visibility', function() {
        assert.isTrue(themesItem._updateThemeSectionVisibility.called); 
        assert.equal(themesItem._themeCount, 2);
      });
    });

    suite('received uninstall event', function() {
      setup(function() {
        themesItem._updateThemes({ type : 'uninstall' });
      });

      test('add themeCount and update visibility', function() {
        assert.isTrue(themesItem._updateThemeSectionVisibility.called); 
        assert.equal(themesItem._themeCount, 0);
      });
    });
  });

  suite('_updateThemeSectionVisibility', function() {
    suite('1 theme installed', function() {
      setup(function() {
        themesItem._themeCount = 1;
        themesItem._updateThemeSectionVisibility();
      });

      test('we would hide section', function() {
        assert.isTrue(themesItem._element.hidden);
      });
    });

    suite('2 themes installed', function() {
      setup(function() {
        themesItem._themeCount = 2;
        themesItem._updateThemeSectionVisibility();
      });

      test('we would show section', function() {
        assert.isFalse(themesItem._element.hidden);
      });
    });
  });
});
