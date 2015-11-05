/* global MockGetDeviceStorage */
'use strict';

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');

suite('AppStorage > ', function() {
  var AppStorage;
  var realDeviceStorage;

  suiteSetup(function(done) {
    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    testRequire(['modules/app_storage'], function(app_storage) {
      AppStorage = app_storage;
      done();
    });
  });

  suiteTeardown(function() {
    navigator.getDeviceStorage = realDeviceStorage;
    realDeviceStorage = null;
  });

  suite('_getSpaceInfo', function() {
    setup(function() {
      this.sinon.spy(AppStorage._appStorage, 'freeSpace');
      this.sinon.spy(AppStorage._appStorage, 'usedSpace');
      AppStorage._getSpaceInfo();
    });

    test('we would call freeSpace and usedSpace in _getSpaceInfo',
      function() {
        assert.ok(AppStorage._appStorage.freeSpace.called);

        var req = AppStorage._appStorage.freeSpace.getCall(0).returnValue;
        req.fireSuccess(100);
        assert.equal(100, AppStorage.freeSize);

        assert.ok(AppStorage._appStorage.usedSpace.called);
        var req2 = AppStorage._appStorage.usedSpace.getCall(0).returnValue;
        req2.fireSuccess(300);
        assert.equal(300, AppStorage.usedSize);
        assert.equal(400, AppStorage.totalSize);
        assert.equal(75, AppStorage.usedPercentage);
    });
  });
});
