'use strict';
/* global MockNavigatorSettings, MockManifestHelper */

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_radio/script.js');
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
    manifestURL: 'app://app1ManifestUrl/manifest.webapp'
  };

  var mock_app2 = {
    manifest: {
      name: 'Theme Red',
      type: 'certified',
      role: 'theme'
    },
    manifestURL: 'app://app2ManifestUrl/manifest.webapp'
  };

  var mock_app3 = {
    manifest: {
      name: 'Theme Blue',
      type: 'certified',
      role: 'theme'
    },
    manifestURL: 'app://app3ManifestUrl/manifest.webapp'
  };

  var mock_app4 = {
    manifest: {
      name: 'Theme Fake',
      type: 'certified'
    },
    manifestURL: 'app://app4ManifestUrl/manifest.webapp'
  };

  var mock_app5 = {
    manifest: {
      name: 'Theme Blue',
      type: 'privileged',
      role: 'theme'
    },
    manifestURL: 'app://app5ManifestUrl/manifest.webapp'
  };

  var mock_app6 = {
    manifest: {
      name: 'My Theme',
      type: 'privileged',
      role: 'theme'
    },
    manifestURL: 'app://mythemeapp/manifest.webapp'
  };

  var mock_app7 = {
    manifest: {
      name: 'My faulty Theme',
      type: 'privileged',
      role: 'theme'
    },
    manifestURL: 'app://myfaultythemeapp/manifest.webapp'
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

  var wallpaper = {
    'homescreen': '/path/to/wallpaper.png'
  };

  var fakeResponses = {
    'app://mythemeapp/wallpaper.json': {
      'status': 200,
      'response': wallpaper
    },
    'app://mythemeapp/path/to/wallpaper.png': {
      'status': 200,
      'response': 'FAKEBLOB'
    },
    'app://myfaultythemeapp/path/to/wallpaper.png': {
      'status': 402,
      'response': 'error'
    }
  };

  function failOnPromiseRejected(reason) {
    assert.isTrue(false, 'Promise rejected ' + reason);
  }

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
      AppsCache._apps = [mock_app1, mock_app2, mock_app3, mock_app4, mock_app5,
       mock_app6, mock_app7];
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
      var themeNames = document.getElementsByTagName('label');
      for (var i = 0; i < refapps.length; i++) {
        assert.equal(themeNames[i].innerHTML, refapps[i].manifest.name);
      }
    });

    test('Current theme should be checked', function() {
      var rule = 'gaia-radio[value="' + selectedTheme + '"]';
      var node = document.querySelector(rule);
      assert.equal(node.checked, true);
    });

    test('MozSettings should be updated on theme change', function() {
      themes.setTheme(refapps[0].manifestURL);
      assert.equal(MockNavigatorSettings.mSettings['theme.selected'],
        refapps[0].manifestURL);
    });
  });

  suite('Themes manipulation >', function() {
    var realXHR = window.XMLHttpRequest;
    var lastXHRCall;

    suiteSetup(function() {
      window.XMLHttpRequest = function(){
        this.status = 0;
      };
      window.XMLHttpRequest.prototype.send = function() {
        var response = fakeResponses[this.url];
        if (!response) {
          this.status = 400;
        } else {
          this.status = response.status;
          this.response = response.response;
        }
        this.onload();
      };
      window.XMLHttpRequest.prototype.open = function(method, url) {
        this.url = url;
        lastXHRCall = url;
      };

      themes._selectedTheme = mock_app6.manifestURL;
    });

    suiteTeardown(function() {
      window.XMLHttpRequest = realXHR;
    });

    suite('set Theme > ', function() {
      setup(function() {
        themes._selectedTheme = mock_app5.manifestURL;
      });

      test('setting a theme', function(done) {
        themes.setTheme(mock_app6.manifestURL).then(function() {
          assert.equal(navigator.mozSettings.mSettings['theme.selected'],
            mock_app6.manifestURL);
          assert.equal(themes._selectedTheme, mock_app6.manifestURL);
        }, failOnPromiseRejected).then(done, done);
      });
    });

    suite('rollback Theme >', function() {
      setup(function(done) {
        themes.setTheme(mock_app6.manifestURL).then(function() {},
          failOnPromiseRejected).then(done, done);
      });
      test('a faulty theme rollback to the previous theme', function(done) {
        this.sinon.spy(themes, 'rollbackTheme');
        themes.setTheme(mock_app7.manifestURL).then(function() {
          // We called rollbackTheme and previous theme is selected
          assert.isTrue(themes.rollbackTheme.calledOnce);
          assert.equal(navigator.mozSettings.mSettings['theme.selected'],
            mock_app6.manifestURL);
          assert.equal(themes._selectedTheme, mock_app6.manifestURL);
        }, failOnPromiseRejected).then(done, done);
      });
    });

    suite('Wallpaper >', function() {
      test('Getting a wallpaper path', function(done) {
        themes._selectedTheme = 'app://mythemeapp/manifest.webapp';
        themes.getWallpaperPath().then(function(path) {
          assert.equal(lastXHRCall, 'app://mythemeapp/wallpaper.json');
          assert.equal(path, wallpaper.homescreen);
        }, failOnPromiseRejected).then(done, done);
      });

      test('Getting wallpaper blob', function(done) {
        themes._selectedTheme = 'app://mythemeapp/manifest.webapp';
        themes.loadWallpaper(wallpaper.homescreen).then(function(blob) {
          assert.equal('FAKEBLOB', blob);
          assert.equal(lastXHRCall, 'app://mythemeapp/path/to/wallpaper.png');
        }, failOnPromiseRejected).then(done, done);
      });

      test('Setting wallpaper', function(done) {
        themes.setWallpaper('BLOB').then(function(data) {
          assert.equal(data['wallpaper.image'],
            'BLOB');
        }, failOnPromiseRejected).then(done, done);
      });

      test('Saving data', function(done) {
        themes.setWallpaper('BLOB').then(
          themes.saveConfig.bind(themes)
        ).then(function() {
          assert.equal(MockNavigatorSettings.mSettings['wallpaper.image'],
           'BLOB');
        }, failOnPromiseRejected).then(done, done);
      });
    });
  });
});
