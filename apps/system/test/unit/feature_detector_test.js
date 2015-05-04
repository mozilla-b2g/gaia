/* global BaseModule */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/feature_detector.js');

suite('system/FeatureDetector', function() {
  var subject;

  setup(function() {
    var getFeaturePromise = Promise.resolve(768);
    navigator.getFeature = this.sinon.stub().returns(getFeaturePromise);

    subject = BaseModule.instantiate('FeatureDetector');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('Hardware memory is correctly retrieved', function(done) {
    assert.isTrue(navigator.getFeature.calledWith('hardware.memory'));
    subject.getDeviceMemory().then(function(mem) {
      assert.equal(mem, 768);
    }).then(done, done);
  });
});
