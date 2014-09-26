'use strict';
/* global MockNavigatormozApps, MockNavigatorSettings, MockManifestHelper */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

suite('Themes > ', function() {
  var mockManifestHelper;
  var themes;

  var realNavigatorSettings;
  var realMozApps;
  var selectedTheme;

  var mock_app1 = {
    manifest: {
      name: 'Theme Green',
      type: 'certified',
      role: 'theme'
    },
    manifestURL: 'app1ManifestUrl'
  };

  var mock_app2 = {
    manifest: {
      name: 'Theme Red',
      type: 'certified',
      role: 'theme'
    },
    manifestURL: 'app2ManifestUrl'
  };

  var mock_app3 = {
    manifest: {
      name: 'Theme Blue',
      type: 'certified',
      role: 'theme'
    },
    manifestURL: 'app3ManifestUrl'
  };

  var mock_app4 = {
    manifest: {
      name: 'Theme Fake',
      type: 'certified'
    },
    manifestURL: 'app4ManifestUrl'
  };

  var mock_app5 = {
    manifest: {
      name: 'Theme Blue',
      type: 'privileged',
      role: 'theme'
    },
    manifestURL: 'app5ManifestUrl'
  };

  var modules = [
    'panels/themes/themes'
  ];

  var maps = {
    'panels/themes/themes': {
      'shared/manifest_helper': 'MockManifestHelper',
      'modules/settings_cache': 'MockSettingsCache'
    }
  };

  suiteSetup(function(done) {
    selectedTheme = mock_app2.manifestURL;
    MockNavigatormozApps.mApps = [mock_app1, mock_app2, mock_app3,
      mock_app4, mock_app5];

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    loadBodyHTML('./_themes.html');

    MockNavigatorSettings.mSettings['theme.selected'] = selectedTheme;

    var self = this;
    this.MockSettingsCache = {
      'cache': {
        'theme.selected': selectedTheme
      }
    };
    define('MockSettingsCache', function() {
      return self.MockSettingsCache;
    });

    define('MockManifestHelper', function() {
      return MockManifestHelper;
    });

    testRequire(modules, maps, function(Themes) {
      mockManifestHelper = MockManifestHelper;
      themes = Themes();
      themes.onInit(document.body);
      themes.onBeforeShow();
      done();
    });
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';

    navigator.mozApps = realMozApps;
    realMozApps = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('Themes list >', function() {
    var refapps = [mock_app3, mock_app1, mock_app2];

    test('All themes should be listed', function() {
      var listItems = document.getElementsByTagName('li');
      assert.equal(listItems.length, refapps.length);
    });

    test('Themes should be listed alphabetically', function() {
      var themeNames = document.getElementsByTagName('span');
      for (var i = 0; i < refapps.length; i++) {
        assert.equal(themeNames[i].innerHTML, refapps[i].manifest.name);
      }
    });

    test('Current theme should be checked', function() {
      var rule = 'input[value="' + selectedTheme + '"]';
      var node = document.querySelector(rule);
      assert.equal(node.checked, true);
    });

    test('MozSettings should be updated on theme change', function() {
      themes.setTheme(refapps[0].manifestURL);
      assert.equal(MockNavigatorSettings.mSettings['theme.selected'],
        refapps[0].manifestURL);
    });
  });
});
