suite('lib/camera/focus', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['lib/camera/focus'], function(Focus) {
      self.Focus = Focus;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();

    // Fake mozCamera
    this.mozCamera = {
      capabilities: {
        focusModes : ["auto", "infinity", "normal",
          "macro", "continuous-picture", "continuous-video" ],
      },
      autoFocus: sinon.stub(),
      setFocusAreas: sinon.stub(),
      setMeteringAreas: sinon.stub(),
      stopContinuousFocus: sinon.stub(),
      resumeContinuousFocus: sinon.stub(),
      startFaceDetection: sinon.spy(),
      stopFaceDetection: sinon.spy()
    };

    this.focus = new this.Focus({});
    this.focus.mozCamera = this.mozCamera;
  });

  suite('Focus#configure()', function() {
    setup(function() {
      this.focus.configureFocusModes = sinon.spy();
    });

    test('mozCamera should be assigned \'auto\' mode by default', function() {
      this.focus.configure(this.mozCamera);
      assert.ok(this.focus.configureFocusModes.called);
      assert.equal(this.mozCamera.focusMode, 'auto');
    });

    test('user preferences override defaults', function() {
      this.focus.continuousAutoFocus = false;
      this.focus.configure(this.mozCamera, 'continuous-picture');
      assert.ok(this.focus.configureFocusModes.called);
      assert.equal(this.mozCamera.focusMode, 'auto');
    });

    test('if user preference don\'t conflict with arguments, the argument sticks', function() {
      this.focus.continuousAutoFocus = true;
      this.focus.configure(this.mozCamera, 'continuous-picture');
      assert.ok(this.focus.configureFocusModes.called);
      assert.equal(this.mozCamera.focusMode, 'continuous-picture');
    });

    test('if not valid focus mode is passed the first available is picked', function() {
      this.focus.configure(this.mozCamera, 'invalid-focus-mode');
      assert.ok(this.focus.configureFocusModes.called);
      assert.equal(this.mozCamera.focusMode, 'auto');
    });

  });

  suite('Focus#getMode', function() {
    setup(function() {
      this.mozCamera.focusMode = 'auto';
    });

    test('it returns the current focus mode', function() {
      this.focus.startFaceDetection();
      assert.ok(this.focus.getMode() === 'auto');
    });

    test('it returns the suspended focus mode', function() {
      this.mozCamera.focusMode  = 'continuous-picture';
      assert.ok(this.focus.getMode() === 'continuous-picture');
    });
  });

  suite('Focus#configureFocusModes()', function() {
    setup(function() {
      var userPreferences = {
        touchFocus: true,
        faceDetection: false
      };

      this.focus = new this.Focus(userPreferences);
      this.focus.mozCamera = this.mozCamera;
      this.sandbox.stub(this.focus, 'isTouchFocusSupported');
      this.sandbox.stub(this.focus, 'isFaceDetectionSupported');
      this.sandbox.stub(this.focus, 'startFaceDetection');
      this.focus.isTouchFocusSupported.returns(true);
      this.focus.isFaceDetectionSupported.returns(true);
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('continous autofocus is enabled by default if supported', function() {
      this.focus.configureFocusModes();
      assert.equal(this.focus.continuousAutoFocus, true);
    });

    test('continous autofocus is disabled if user preferences desable it', function() {
      this.focus.userPreferences.continuousAutoFocus = false;
      this.focus.configureFocusModes();
      assert.equal(this.focus.continuousAutoFocus, false);
    });

    test('touch to focus is enabled by default if available', function() {
      this.focus.configureFocusModes();
      assert.equal(this.focus.touchFocus, true);
    });

    test('touch to focus is disabled if user preferences disable it', function() {
      this.focus.userPreferences.touchFocus = false;
      this.focus.configureFocusModes();
      assert.equal(this.focus.touchFocus, false);
    });

    test('touch to focus is disabled if hardware doesn\'t support it', function() {
      this.focus.isTouchFocusSupported.returns(false);
      this.focus.configureFocusModes();
      assert.equal(this.focus.touchFocus, false);
    });

    test('touch to focus disabled if hardware doesn\'t support it and even if user preferences enable it', function() {
      this.focus.userPreferences.touchFocus = true;
      this.focus.isTouchFocusSupported.returns(false);
      this.focus.configureFocusModes();
      assert.equal(this.focus.touchFocus, false);
    });

    test('it does not call startFaceDetection if face detection is disabled', function() {
      this.focus.userPreferences.faceDetection = true;
      this.focus.isFaceDetectionSupported.returns(false);
      this.focus.configureFocusModes();
      assert.ok(!this.focus.startFaceDetection.called);
    });

    test('it calls startFaceDetection if face detection is enabled', function() {
      this.focus.userPreferences.faceDetection = true;
      this.focus.isFaceDetectionSupported.returns(true);
      this.focus.configureFocusModes();
      assert.ok(this.focus.startFaceDetection.called);
    });

  });

  suite('Focus#startFaceDetection', function() {
    setup(function() {
      this.focus.faceDetection = true;
    });

    test('mozCamera startFaceDetection is called to start face detection if face detection enabled', function() {
      this.focus.startFaceDetection();
      assert.ok(this.mozCamera.startFaceDetection.called);
    });

    test('mozCamera startFaceDetection is not called to start face detection if face detection disabled', function() {
      this.focus.faceDetection = false;
      this.focus.startFaceDetection();
      assert.ok(!this.mozCamera.startFaceDetection.called);
    });

  });

  suite('Focus#clearFaceDetection', function() {
    setup(function() {
      this.focus.faceDetection = true;
      this.sandbox.spy(this.focus, 'focusOnLargestFace');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('focusOnLargestFace is called to start face detection if face detection enabled', function() {
      this.focus.clearFaceDetection();
      assert.ok(this.focus.focusOnLargestFace.calledWith([]));
    });

    test('focusOnLargestFace is not called to start face detection if face detection disabled', function() {
      this.focus.faceDetection = false;
      this.focus.clearFaceDetection();
      assert.ok(!this.focus.focusOnLargestFace.called);
    });

  });

  suite('Focus#stopFaceDetection', function() {
    setup(function() {
      this.focus.faceDetection = true;
      this.focus.mozCamera = this.mozCamera;
      this.sandbox.spy(this.focus, 'stopFaceDetection');
      this.sandbox.spy(this.focus, 'clearFaceDetection');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('mozCamera stopFaceDetection is called to stop face detection', function() {
      this.focus.stopFaceDetection();
      assert.ok(this.mozCamera.stopFaceDetection.called);
    });

    test('mozCamera stopFaceDetection is not called if face detection is not available', function() {
      this.focus.faceDetection = false;
      this.focus.stopFaceDetection();
      assert.ok(!this.mozCamera.stopFaceDetection.called);
      assert.ok(!this.focus.clearFaceDetection.called);
    });

  });

  suite('Focus#suspendFaceDetection', function() {
    setup(function() {
      this.clock = sinon.useFakeTimers();
      this.focus.faceDetectionSuspended = undefined;
      this.focus.faceFocused = true;
    });

    teardown(function() {
      this.clock.restore();
    });

    test('mozCamera suspendFaceDetection resets timers', function() {
      this.focus.suspendFaceDetection(500, 300);
      this.clock.tick(500);
      assert.ok(this.focus.faceDetectionSuspended);
      this.clock.tick(300);
      assert.ok(!this.focus.faceFocused);
    });
  });

  suite('Focus#resumeContinuousFocus', function() {
    setup(function() {
      this.focus.mozCamera = this.mozCamera;
      this.focus.previousMode = 'auto';
      this.mozCamera.focusMode = 'continuous-picture';
    });

    test('mozCamera resumeContinuousFocus is called', function() {
      this.focus.resumeContinuousFocus();
      assert.ok(!this.focus.suspendedMode);
      assert.ok(this.focus.mozCamera.resumeContinuousFocus.called);
    });
  });

  suite('Focus#onAutoFocusMoving', function() {
    setup(function() {
      this.sandbox.spy(this.focus, 'updateFocusState');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should call updateFocusState', function() {
      this.focus.onAutoFocusMoving(true);
      assert.ok(this.focus.updateFocusState.calledWith('focusing'));
    });

    test('should not call updateFocusState', function() {
      this.focus.onAutoFocusMoving(false);
      assert.ok(!this.focus.updateFocusState.called);
    });
  });

  suite('Focus#onAutoFocusCompleted', function() {
    setup(function() {
      this.sandbox.spy(this.focus, 'updateFocusState');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should call updateFocusState', function() {
      this.focus.onAutoFocusCompleted(true);
      assert.ok(this.focus.updateFocusState.calledWith('focused'));
      this.focus.onAutoFocusCompleted(false);
      assert.ok(this.focus.updateFocusState.calledWith('fail'));
    });
  });

  suite('Focus#updateFocusState', function() {
    setup(function() {
      this.sandbox.spy(this.focus, 'onAutoFocusChanged');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should call onAutoFocusChanged', function() {
      this.focus.focusState = 'focused';
      this.focus.updateFocusState('focusing');
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      this.focus.updateFocusState('focused');
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focused'));
      this.focus.updateFocusState('focusing');
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      this.focus.updateFocusState('fail');
      assert.ok(this.focus.onAutoFocusChanged.calledWith('fail'));
    });

    test('should not call onAutoFocusChanged', function() {
      this.focus.focusState = 'focused';
      this.focus.updateFocusState('focused');
      assert.ok(!this.focus.onAutoFocusChanged.called);
      this.focus.updateFocusState('fail');
      assert.ok(!this.focus.onAutoFocusChanged.called);
      this.focus.focusState = 'focusing';
      this.focus.updateFocusState('focusing');
      assert.ok(!this.focus.onAutoFocusChanged.called);
    });
  });

  suite('Focus#suspendContinuousFocus', function() {
    setup(function() {
      this.clock = sinon.useFakeTimers();
      this.focus.mozCamera = this.mozCamera;
      this.sandbox.spy(this.focus, 'resumeContinuousFocus');
      this.focus.continuousModeTimer = undefined;
    });

    teardown(function() {
      this.sandbox.restore();
      this.clock.restore();
    });

    test('mozCamera resumeContinuousFocus is called', function() {
      this.focus.suspendContinuousFocus(500);
      assert.ok(this.focus.continuousModeTimer !== undefined);
      this.clock.tick(500);
      assert.ok(this.focus.resumeContinuousFocus.called);
    });
  });

  suite('Focus#focusOnLargestFace', function() {

    setup(function() {
      this.sandbox.spy(this.focus, 'onFacesDetected');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('it should not focus on any face if face detection is suspended', function() {
      this.focus.touchFocus = true;
      this.focus.faceDetectionSuspended = true;
      this.focus.focusOnLargestFace([{
        id: 3,
        score: 80,
        bounds: {
          height: 300,
          width: 300
        }
      }]);
      assert.ok(this.focus.onFacesDetected.calledWith([]));
    });

  });

  suite('Focus#focus()', function() {
    setup(function() {
      this.focus.focusMode = 'auto';
      this.focus.onAutoFocusChanged = sinon.spy();
    });

    test('mozCamera autoFocus is called if focus mode is auto', function() {
      this.mozCamera.focusMode = 'auto';
      this.focus.focus(function() {});
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      assert.ok(this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus is called if focus mode is continuous-picture', function() {
      this.mozCamera.focusMode = 'continuous-picture';
      this.focus.focus(function() {});
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      assert.ok(this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus is not called if focus mode is neither auto nor continuous-picture', function() {
      this.mozCamera.focusMode = 'infinity';
      this.focus.focus(function() {});
      assert.ok(!this.focus.onAutoFocusChanged.called);
      assert.ok(!this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus callback is called with error and focus state switches to false', function() {
      var onFocused = sinon.spy();
      this.mozCamera.autoFocus = sinon.stub();
      this.mozCamera.focusMode = 'auto';
      this.mozCamera.autoFocus.callsArgWith(0, undefined);
      this.focus.focus(onFocused);
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      assert.ok(this.mozCamera.autoFocus.called);
      assert.ok(onFocused.calledWith('failed'));
      assert.ok(!this.focus.focused);
    });

    test('mozCamera autoFocus callback is called with success and focus state switches to true', function() {
      var onFocused = sinon.spy();
      this.mozCamera.autoFocus = sinon.stub();
      this.mozCamera.focusMode = 'auto';
      this.mozCamera.autoFocus.callsArgWith(0, 'success');
      this.focus.focus(onFocused);
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      assert.ok(this.mozCamera.autoFocus.called);
      assert.ok(onFocused.calledWith('focused'));
      assert.ok(this.focus.focused);
    });

    test('with focus mode different than auto or continuous-picture callback is called with no arguments and focus state doesn\'t change', function(done) {
      var onFocused = function(result) {
        assert.equal(result, undefined);
        done();
      };
      var previousFocusState;
      this.focus.focused = true;
      previousFocusState = this.focus.focused;
      this.mozCamera.autoFocus = sinon.stub();
      this.mozCamera.focusMode = 'infinity';
      this.focus.focus(onFocused);
      assert.ok(!this.focus.onAutoFocusChanged.called);
      assert.ok(!this.mozCamera.autoFocus.called);
      assert.ok(previousFocusState === this.focus.focused);
    });

    test('Should call the focus callback with interrupted state if autofocus is interrupted', function() {
      var onFocused = sinon.spy();
      this.mozCamera.autoFocus = sinon.stub();
      this.mozCamera.autoFocus.callsArgWith(1, 'AutoFocusInterrupted');
      this.mozCamera.focusMode = 'auto';
      this.focus.focused = true;
      this.focus.focus(onFocused);
      assert.ok(onFocused.calledWith('interrupted'));
      assert.ok(this.focus.focused === false);
    });
  });

  suite('Focus#pause()', function() {
    setup(function() {
      this.focus.stopContinuousFocus = sinon.spy();
      this.focus.stopFaceDetection = sinon.spy();
    });

    test('Should do nothing if already paused', function() {
      this.focus.paused = true;
      this.focus.pause();
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.stopFaceDetection.called);
      assert.ok(this.focus.paused);

    });

    test('Should stop face detection and continuous focus', function() {
      this.focus.paused = false;
      this.focus.pause();
      assert.ok(this.focus.stopContinuousFocus.called);
      assert.ok(this.focus.stopFaceDetection.called);
      assert.ok(this.focus.paused);
    });
  });

  suite('Focus#reset()', function() {
    test('metering areas and focus areas are reset if touch focus enabled', function() {
      this.focus.touchFocus = true;
      this.focus.resetFocusAreas();
      assert.ok(this.focus.mozCamera.setFocusAreas.calledWith([]));
      assert.ok(this.focus.mozCamera.setMeteringAreas.calledWith([]));
    });

    test('metering areas and focus areas are not reset if touch focus disabled', function() {
      this.focus.touchFocus = false;
      this.focus.resetFocusAreas();
      assert.ok(!this.focus.mozCamera.setFocusAreas.called);
      assert.ok(!this.focus.mozCamera.setMeteringAreas.called);
    });
  });

  suite('Focus#resume()', function() {
    setup(function() {
      this.focus.resumeContinuousFocus = sinon.spy();
    });

    test('should do nothing if not paused', function() {
      this.focus.paused = false;
      this.focus.resume();
      assert.ok(!this.focus.resumeContinuousFocus.called);
      assert.ok(!this.focus.paused);
    });

    test('resumeContinuousFocus called if focus mode is continuous-picture', function() {
      this.focus.paused = true;
      this.focus.mozCamera.focusMode = 'continuous-picture'
      this.focus.resume();
      assert.ok(this.focus.resumeContinuousFocus.called);
      assert.ok(!this.focus.paused);
    });

  });

  suite('Focus#isTouchFocusSupported()', function() {
    setup(function() {
      this.focus.mozCamera.capabilities = {};
    });

    test('it returns false if touch to focus not supported by hardware', function() {
      this.focus.mozCamera.capabilities.maxFocusAreas = 0;
      this.focus.mozCamera.capabilities.maxMeteringAreas = 0;
      assert.ok(!this.focus.isTouchFocusSupported());
    });

    test('it returns true if touch to focus supported by hardware', function() {
      this.focus.mozCamera.capabilities.maxFocusAreas = 4;
      this.focus.mozCamera.capabilities.maxMeteringAreas = 4;
      assert.ok(this.focus.isTouchFocusSupported());
    });
  });

  suite('Focus#isFaceDetectionSupported()', function() {

    test('it returns true if hardware supports face detection', function() {
      this.focus.mozCamera.capabilities = {
        maxDetectedFaces: 5
      };
      this.focus.mozCamera.startFaceDetection = sinon.stub();
      assert.ok(this.focus.isFaceDetectionSupported() === true);
    });

    test('it returns false if hardware doesn\'t support face detection', function() {
      this.focus.mozCamera.capabilities = {
        maxDetectedFaces: 0
      };
      this.focus.mozCamera.startFaceDetection = undefined;
      assert.ok(this.focus.isFaceDetectionSupported() === false);
    });

  });

  suite('Focus#updateFocusArea()', function() {
    setup(function() {
      this.focus.focus = sinon.spy();
      this.focus.stopContinuousFocus = sinon.spy();
      this.focus.stopFaceDetection = sinon.spy();
      this.focus.onAutoFocusChanged = sinon.spy();
    });

    test('it returns without doing anything if touch to focus disabled', function() {
      this.focus.touchFocus = false;
      this.focus.updateFocusArea();
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.stopFaceDetection.called);
      assert.ok(!this.focus.mozCamera.setFocusAreas.called);
      assert.ok(!this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(!this.focus.focus.called);
      assert.ok(!this.focus.onAutoFocusChanged.called);
    });

    test('it updates focus area if touch to focus is enabled', function() {
      this.focus.touchFocus = true;
      this.focus.updateFocusArea();
      assert.ok(this.focus.onAutoFocusChanged.calledWith('focusing'));
      assert.ok(this.focus.stopContinuousFocus.called);
      assert.ok(this.focus.stopFaceDetection.called);
      assert.ok(this.focus.mozCamera.setFocusAreas.called);
      assert.ok(this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(this.focus.focus.called);
    });

    test('Should call focus callback with fail state if updating the focus area fails', function() {
      this.focus.touchFocus = true;
      var onFocused = sinon.spy();
      this.focus.updateFocusArea(null, onFocused);
      assert.ok(this.focus.focus.called);
      this.focus.focus.callArgWith(0, 'failed');
      assert.ok(onFocused.calledWith('failed'));
    });
  });

});