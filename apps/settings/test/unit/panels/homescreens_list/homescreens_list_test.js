/* global MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('homescreens_list > ', () => {
  var modules = [
    'unit/mock_apps_cache',
    'shared_mocks/mock_manifest_helper',
    'panels/homescreens_list/homescreens_list'
  ];

  var maps = {
    '*': {
      'modules/apps_cache': 'unit/mock_apps_cache',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper'
    }
  };

  var elements = {
    homescreensList: document.createElement('div'),
    moreLink: document.createElement('div')
  };
  var homescreensList;
  var mockAppsCache;
  var mockManifestHelper;
  var realNavigatorSettings;
  var apps = [
    {
      origin: 'app://homescreen.gaiamobile.org',
      manifestURL: 'app://homescreen.gaiamobile.org/manifest.webapp',
      manifest: {
        type: 'privileged',
        role: 'homescreen',
        inputs: {},
        permissions: {}
      }
    },
    {
      origin: 'app://verticalhome.gaiamobile.org',
      manifestURL: 'app://verticalhome.gaiamobile.org/manifest.webapp',
      manifest: {
        type: 'privileged',
        role: 'homescreen',
        inputs: {},
        permissions: {}
      }
    }
  ];

  suiteSetup(done => {
    testRequire(modules, maps, (MockAppsCache, MockManifestHelper,
                                HomescreensList) => {
      mockManifestHelper = MockManifestHelper;
      mockAppsCache = MockAppsCache;

      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      homescreensList = HomescreensList();
      done();
    });
  });

  suiteTeardown(() => {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('initialisation', () => {
    setup(function() {
      this.sinon.stub(homescreensList, '_renderHomescreens');
      this.sinon.spy(window, 'addEventListener');
      homescreensList.init(elements);
    });

    test('we would call _renderHomescreens in init', () => {
      assert.ok(homescreensList._renderHomescreens.called);
    });

    test('we would call _renderHomescreens in applicationinstall',
      () => {
        assert.ok(window.addEventListener.calledWith('applicationinstall'));
        window.dispatchEvent(new CustomEvent('applicationinstall'));
        assert.ok(homescreensList._renderHomescreens.calledTwice);
      });

    test('we would call _renderHomescreens in applicationuninstall',
      () => {
        assert.ok(window.addEventListener.calledWith('applicationuninstall'));
        window.dispatchEvent(new CustomEvent('applicationuninstall'));
        assert.ok(homescreensList._renderHomescreens.calledTwice);
      });
  });

  suite('_renderHomescreens', () => {
    setup(function() {
      this.sinon.stub(homescreensList, 'listBuilder');
    });

    test('we would call listBuilder in _renderHomescreens', done => {
      homescreensList._renderHomescreens().then(() => {
        assert.equal(homescreensList._apps.length, 0);
        assert.ok(homescreensList.listBuilder.called);
      }, () => {
        // We should not reject here
        assert.isTrue(false);
      }).then(done, done);
    });
  });

  suite('listBuilder', () => {
    setup(function() {
      this.sinon.spy(document, 'createDocumentFragment');
      this.sinon.stub(homescreensList, '_listItemBuilder', () => {
        return document.createElement('div');
      });
      homescreensList._container = document.body;
      homescreensList._apps = apps;
      homescreensList.listBuilder();
    });

    test('createDocumentFragment is called', () => {
      assert.ok(document.createDocumentFragment.called);
    });

    test('_listItemBuilder is called', () => {
      assert.ok(homescreensList._listItemBuilder.calledTwice);
    });
  });
});
