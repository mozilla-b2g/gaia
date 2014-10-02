/*global MockNavigatorSettings*/
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('HomescreensDetails > ', function() {
  var HomescreensDetails;
  var realNavigatorSettings;

  var modules = [
    'panels/homescreens_details/homescreens_details'
  ];
  var maps = {
    '*': {}
  };

  var elements = {
    detailButton: document.createElement('div'),
    detailTitle: document.createElement('div'),
    detailDescription: document.createElement('div')
  };
  var options = {
    index: '0',
    name: 'home',
    description: 'test homescreen',
    manifestURL: 'app://testhome.gaiamobile.org'
  };

  suiteSetup(function(done) {
    testRequire(modules, maps, function(module) {
      realNavigatorSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      HomescreensDetails = module();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  suite('onInit', function() {
    setup(function() {
      this.sinon.spy(HomescreensDetails, '_handleChangeHomescreen');
      HomescreensDetails.init(elements);

      HomescreensDetails._manifestURL = 'app://test.gaiamobile.org';
      HomescreensDetails._elements.detailButton
        .dispatchEvent(new CustomEvent('click'));
    });

    test('When users click on the button,' +
      'we would definitely change the URL in mozSettings', function() {
        assert.ok(HomescreensDetails._handleChangeHomescreen.called);
        assert.equal(MockNavigatorSettings.mSettings['homescreen.manifestURL'],
          HomescreensDetails._manifestURL);
    });
  });

  suite('onBeforeShow', function() {
    setup(function() {
      this.sinon.stub(HomescreensDetails, '_handleChangeHomescreen');
      HomescreensDetails.init(elements);
      HomescreensDetails.onBeforeShow(options);
    });

    test('we would set element value in onBeforeShow', function() {
      assert.equal(HomescreensDetails._elements.detailTitle.textContent,
        options.name);
      assert.equal(HomescreensDetails._elements.detailDescription.textContent,
        options.description);
    });
  });
});
