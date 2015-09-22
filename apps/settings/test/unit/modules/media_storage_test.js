/* global MockGetDeviceStorage, MockGetDeviceStorages, MockDOMRequest */
'use strict';

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorages.js');

suite('MediaStorage > ', function() {
  var MediaStorage;
  var realDeviceStorage, realDeviceStorages;
  var modules = [
    'modules/media_storage'
  ];
  var map = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  suiteSetup(function() {
    realDeviceStorages = navigator.getDeviceStorages;
    navigator.getDeviceStorages = MockGetDeviceStorages;

    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;
  });

  suiteTeardown(function() {
    navigator.getDeviceStorages = realDeviceStorages;
    realDeviceStorages = null;

    navigator.getDeviceStorage = realDeviceStorage;
    realDeviceStorage = null;
  });

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    requireCtx(modules, function(media_storage) {
      MediaStorage = media_storage;
      done();
    });
  });

  suite('_updateMediaStorageInfo', function() {
    setup(function() {
      this.sinon.stub(MediaStorage, '_updateVolumeState');
    });

    test('when no _defaultMediaVolume',
      function() {
        MediaStorage._defaultMediaVolume = null;
        MediaStorage._updateMediaStorageInfo();
        assert.ok(MediaStorage._updateVolumeState.calledWith(null,
          'unavailable'));
    });

    test('when has _defaultMediaVolume', function() {
        MediaStorage._defaultMediaVolume = MockGetDeviceStorage();
        this.sinon.stub(MediaStorage._defaultMediaVolume, 'available')
          .returns(MockDOMRequest);
        MediaStorage._updateMediaStorageInfo();
        assert.ok(MediaStorage._defaultMediaVolume.available.called);
    });
  });

  suite('_getDefaultVolume', function() {
    setup(function() {
      this.sinon.spy(navigator, 'getDeviceStorages');
    });

    test('call navigator.getDeviceStorages to get default volume',
      function() {
        MediaStorage._getDefaultVolume();
        assert.ok(navigator.getDeviceStorages.calledWith('sdcard'));
    });
  });
});
