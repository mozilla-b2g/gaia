/* global MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('Homescreens_details > ', () => {
  var modules = [
    'panels/homescreen_details/homescreen_details'
  ];

  var maps = {
    '*': {
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/navigator/mozApps': 'unit/mock_moz_apps'
    }
  };

  const DEFAULT_MANIFEST = 'app://verticalhome.gaiamobile.org/manifest.webapp';

  var elements = {
    detailTitle: document.createElement('div'),
    detailURLLink: document.createElement('div'),
    detailName: document.createElement('div'),
    detailURL: document.createElement('div'),
    detailVersion: document.createElement('div'),
    detailDescription: document.createElement('div'),
    uninstallButton: document.createElement('div')
  };
  var options = {
    index: '0',
    name: 'home',
    description: 'test homescreen',
    manifestURL: 'app://testhome.gaiamobile.org'
  };
  var homescreensDetails;
  var realNavigatorSettings;

  suiteSetup(done => {
    testRequire(modules, maps, HomescreensDetails => {
      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      homescreensDetails = HomescreensDetails();
      done();
    });
  });

  suiteTeardown(() => {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('onInit', () => {
    var uninstallStub;

    setup(() => {
      uninstallStub = this.sinon.spy(homescreensDetails, 'uninstall');
      this.sinon.stub(homescreensDetails, 'back');
      homescreensDetails.init(elements);

      homescreensDetails._elements.uninstallButton
        .dispatchEvent(new CustomEvent('click'));
    });

    teardown(() => {
      uninstallStub.restore();
    });

    test('When users click on the button, ' +
      'the manifest URL should change in mozSettings', done => {
      assert.ok(uninstallStub.called);
      assert.equal(MockNavigatorSettings.mSettings['homescreen.manifestURL'],
        DEFAULT_MANIFEST);
      setTimeout(() => {
        assert.ok(homescreensDetails.back.called);
        done();
      });
    });
  });

  suite('onBeforeShow', () => {
    var uninstallStub;

    setup(() => {
      uninstallStub = this.sinon.stub(homescreensDetails, 'uninstall');
      homescreensDetails.init(elements);
      homescreensDetails.onBeforeShow(options);
    });

    teardown(() => {
      uninstallStub.restore();
    });

    test('we would set element value in onBeforeShow', () => {
      assert.equal(homescreensDetails._elements.detailTitle.textContent,
        options.name);
      assert.equal(homescreensDetails._elements.detailDescription.textContent,
        options.description);
    });
  });
});
