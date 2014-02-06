'use strict';

self.mocha.globals(['AltCameraManager', 'CustomEvent', 'SecureWindowFactory',
               'addEventListener', 'dispatchEvent', 'secureWindowFactory']);

requireApp('system/test/unit/mock_secure_window_factory.js');
requireApp('system/js/lockscreen/alt_camera_manager.js');

var mocks = new self.MocksHelper([
  'SecureWindowFactory'
]).init();

suite('system/lockscreen/AltCameraManager', function() {
  mocks.attachTestHelpers();
  var stubById;
  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
  });

  teardown(function() {
    stubById.restore();
  });

  test('from clicking to launch', function() {
    var altCameraManager = new self.AltCameraManager(),
        stubCreate = this.sinon.stub(self.secureWindowFactory, 'create'),
        stubLaunch = this.sinon.stub(altCameraManager, 'launch');
    altCameraManager.handleEvent({type: 'click',
        target: altCameraManager.elements.altCameraButton});
    self.assert.isTrue(stubLaunch.called,
      'the camera didn\'t launch');
    self.assert.isTrue(stubCreate.calledWithMatch(sinon.match(
      function(url, manifestURL) {
        return null !== url.match('camera');
      })),
      'the camera window didn\'t create because wrong' +
      'parameters pased to the factory');
    stubLaunch.restore();
    stubCreate.restore();
  });
});

