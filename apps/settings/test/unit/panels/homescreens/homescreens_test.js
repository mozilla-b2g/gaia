/*global MockNavigatorSettings*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('Homescreens > ', function() {
  var Homescreens;
  var mockAppsCache;
  var manifestHelper;
  var realNavigatorSettings;

  var modules = [
    'shared_mocks/mock_manifest_helper',
    'unit/mock_apps_cache',
    'panels/homescreens/homescreens'
  ];

  var maps = {
    '*': {
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/apps_cache': 'unit/mock_apps_cache'
    }
  };

  var dom = document.createElement('div');
  var apps = [{
    origin: 'app://homescreen.gaiamobile.org',
    manifestURL: 'app://homescreen.gaiamobile.org/manifest.webapp',
    manifest: {
      type: 'privileged',
      role: 'homescreen',
      inputs: {},
      permissions: {
      }
    }
  },
  {
    origin: 'app://verticalhome.gaiamobile.org',
    manifestURL: 'app://verticalhome.gaiamobile.org/manifest.webapp',
    manifest: {
      type: 'privileged',
      role: 'homescreen',
      inputs: {},
      permissions: {
      }
    }
  }];

  suiteSetup(function(done) {
    testRequire(modules, maps,
      function(MockManifestHelper, MockAppsCache, module) {
        manifestHelper = MockManifestHelper;
        mockAppsCache = MockAppsCache;

        realNavigatorSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;

        Homescreens = module();
        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(Homescreens, '_renderHomescreens');
      this.sinon.spy(window, 'addEventListener');
      Homescreens.init(dom);
    });

    test('we would call _renderHomescreens in init', function() {
      assert.ok(Homescreens._renderHomescreens.called);
    });

    test('we would call _renderHomescreens in applicationinstall',
      function() {
        assert.ok(window.addEventListener.calledWith('applicationinstall'));
        window.dispatchEvent(new CustomEvent('applicationinstall'));
        assert.ok(Homescreens._renderHomescreens.calledTwice);
    });

    test('we would call _renderHomescreens in applicationuninstall',
      function() {
        assert.ok(window.addEventListener.calledWith('applicationuninstall'));
        window.dispatchEvent(new CustomEvent('applicationuninstall'));
        assert.ok(Homescreens._renderHomescreens.calledTwice);
    });
  });

  suite('_renderHomescreens', function() {
    setup(function() {
      this.sinon.stub(Homescreens, '_listBuilder');
    });

    test('we would call _listBuilder in _renderHomescreens', function(done) {
      Homescreens._renderHomescreens().then(function() {
        assert.equal(Homescreens._apps.length, 0);
        assert.ok(Homescreens._listBuilder.called);
      }, function() {
        // We should not reject here
        assert.isTrue(false);  
      }).then(done, done);
    });
  });

  suite('_listBuilder', function() {
    setup(function() {
      this.sinon.spy(document, 'createDocumentFragment');
      this.sinon.stub(Homescreens, '_listItemBuilder', function() {
        return dom;
      });
      Homescreens._container = document.body;
      Homescreens._apps = apps;
      Homescreens._listBuilder();
    });

    test('createDocumentFragment is called', function() {
      assert.ok(document.createDocumentFragment.called);
    });

    test('_listItemBuilder is called', function() {
      assert.ok(Homescreens._listItemBuilder.calledTwice);
    });
  });
});
