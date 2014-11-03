'use strict';
/* global MockNavigatorSettings, MockManifestHelper */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_manifest_helper.js');

suite('Themes > ', function() {
  var mockManifestHelper;
  var themes;

  var realNavigatorSettings;
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

  var mock_app6 = {
    manifest: {
      name: 'My Theme',
      type: 'privileged',
      role: 'theme'
    },
    manifestURL: 'app://mythemeapp/manifest.webapp'
  };

  var modules = [
    'panels/themes/themes',
    'unit/mock_apps_cache'
  ];

  var maps = {
    'panels/themes/themes': {
      'shared/manifest_helper': 'MockManifestHelper',
      'modules/settings_cache': 'MockSettingsCache',
      'modules/apps_cache': 'unit/mock_apps_cache'
    }
  };

  suiteSetup(function(done) {
    selectedTheme = mock_app2.manifestURL;
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

    testRequire(modules, maps, function(Themes, AppsCache) {
      AppsCache._apps = [mock_app1, mock_app2, mock_app3, mock_app4, mock_app5];
      mockManifestHelper = MockManifestHelper;
      themes = Themes();
      themes.onInit(document.body);
      themes.onBeforeShow();
      done();
    });
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';

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

  suite('Themes wallpaper >', function() {
    var realXHR = window.XMLHttpRequest;
    var currentResponse;
    var lastXHRCall;
    var wallpaper = {
      'homescreen': '/path/to/wallpaper.png'
    };

    suiteSetup(function() {
      window.XMLHttpRequest = function(){
        this.status = 0;
      };
      window.XMLHttpRequest.prototype.send = function() {
        this.status = 200;
        this.response = currentResponse;
        this.onload();
      };
      window.XMLHttpRequest.prototype.open = function(method, url) {
        lastXHRCall = url;
      };

      themes._selectedTheme = mock_app6.manifestURL;
    });

    suiteTeardown(function() {
      window.XMLHttpRequest = realXHR;
    });

    test('Getting a wallpaper path', function(done) {
      currentResponse = wallpaper;
      themes.getWallpaperPath().then(function(path) {
        assert.equal(lastXHRCall, 'app://mythemeapp/wallpaper.json');
        assert.equal(path, currentResponse.homescreen);
      }, function() {}).then(done, done);
    });

    test('Getting wallpaper blob', function(done) {
      currentResponse = 'FAKEBLOB';
      themes.loadWallpaper(wallpaper.homescreen).then(function(blob) {
        assert.equal('FAKEBLOB', blob);
        assert.equal(lastXHRCall, 'app://mythemeapp/path/to/wallpaper.png');
      }, function() {}).then(done, done);
    });

    test('Setting wallpaper', function(done) {
      themes.setWallpaper('BLOB').then(function() {
        assert.equal(MockNavigatorSettings.mSettings['wallpaper.image'],
          'BLOB');
      }, function() {}).then(done, done);
    });
  });
});
