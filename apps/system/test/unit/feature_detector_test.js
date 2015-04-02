/* global MockPromise, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_promise.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/feature_detector.js');

suite('system/FeatureDetector', function() {
  var subject;

  setup(function() {
    var getFeaturePromise = new MockPromise();
    navigator.getFeature = this.sinon.stub().returns(getFeaturePromise);

    subject = BaseModule.instantiate('FeatureDetector');
    subject.start();

    getFeaturePromise.mFulfillToValue(768);
  });

  teardown(function() {
    subject.stop();
  });

  test('Hardware memory is correctly retrieved', function() {
    assert.equal(subject.deviceMemory, 768);
    assert.isTrue(navigator.getFeature.calledWith('hardware.memory'));
  });
});
