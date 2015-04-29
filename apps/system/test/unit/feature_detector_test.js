/* global MockPromise, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_promise.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/feature_detector.js');

suite('system/FeatureDetector', function() {
  var subject;
  var getFeaturePromise;

  setup(function() {
    getFeaturePromise = new MockPromise();
    navigator.getFeature = this.sinon.stub().returns(getFeaturePromise);

    subject = BaseModule.instantiate('FeatureDetector');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('The device memory would be init as undefined', function() {
    assert.equal(subject.deviceMemory, undefined);
  });

  test('Hardware memory is correctly retrieved', function() {
    getFeaturePromise.mFulfillToValue(768);

    assert.equal(subject.deviceMemory, 768);
    assert.isTrue(navigator.getFeature.calledWith('hardware.memory'));
  });
});
