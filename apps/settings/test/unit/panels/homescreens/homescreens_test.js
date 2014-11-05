/*global MockNavigatormozApps, MockNavigatorSettings*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

suite('Homescreens > ', function() {
  var Homescreens;
  var manifestHelper;
  var realMozApps, realNavigatorSettings;

  var modules = [
    'shared_mocks/mock_manifest_helper',
    'panels/homescreens/homescreens'
  ];
  var maps = {
    '*': {
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
      'modules/settings_service': 'unit/mock_settings_service'
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
    testRequire(modules, maps, function(MockManifestHelper, module) {
      manifestHelper = MockManifestHelper;

      realMozApps = navigator.mozApps;
      navigator.mozApps = MockNavigatormozApps;

      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      Homescreens = module();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    realMozApps = null;

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
      this.sinon.stub(navigator.mozApps.mgmt, 'getAll', function() {
        return {};
      });
      this.sinon.stub(Homescreens, '_listBuilder');
      Homescreens._renderHomescreens();
    });

    test('we would call mozApps.mgmt.getAll in _renderHomescreens',
      function() {
        assert.ok(navigator.mozApps.mgmt.getAll.called);
    });

    test('we would call _listBuilder in _renderHomescreens', function() {
      var request = navigator.mozApps.mgmt.getAll.returnValues[0];
      request.result = [];
      request.onsuccess({ target: request });
      assert.equal(Homescreens._apps.length, 0);
      assert.ok(Homescreens._listBuilder.called);
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
