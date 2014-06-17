suite('lib/camera/focus', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['lib/camera/focus'], function(Focus) {
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
      this.focus.mode = 'auto';
    });

    test('it returns the current focus mode', function() {
      this.focus.startFaceDetection();
      assert.ok(this.focus.getMode() === 'auto');
    });

    test('it returns the suspended focus mode', function() {
      this.focus.mode = 'continuous-picture';
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
      this.focus.mode = 'auto';
      this.mozCamera.focusMode = 'continuous-picture';
    });

    test('mozCamera resumeContinuousFocus is called', function() {
      this.focus.resumeContinuousFocus();
      assert.ok(this.focus.mozCamera.focusMode === 'auto');
      assert.ok(this.focus.suspendedFocusMode === undefined);
      assert.ok(this.focus.mozCamera.resumeContinuousFocus.called);
    });
  });

  suite('Focus#onAutoFocusMoving', function() {
    setup(function() {
      this.sandbox.spy(this.focus, 'onAutoFocusChanged');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should call onAutoFocusChanged', function() {
      this.focus.onAutoFocusMoving(true);
      assert.ok(this.focus.onAutoFocusChanged.called);
    });

    test('should not call onAutoFocusChanged', function() {
      this.focus.onAutoFocusMoving(false);
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

  suite('Focus#facesAlreadyDetected', function() {
    setup(function() {
      this.focus.detectedFaces = [];
    });

    test('it should return false if not faces have been previously detected', function() {
      assert.ok(!this.focus.facesAlreadyDetected([1,2,3]));
    });

    test('it should return false if different faces have been previously detected', function() {
      this.focus.detectedFaces = [1,2];
      assert.ok(!this.focus.facesAlreadyDetected([1,2,3]));
    });

    test('it should return true if the same faces have been previously detected', function() {
      this.focus.detectedFaces = [1,2,3];
      assert.ok(this.focus.facesAlreadyDetected([1,2,3]));
    });
  });

  suite('Focus#filterAndSortDetectedFaces', function() {

    test('it should return empty array if not faces have been detected', function() {
      assert.ok(this.focus.filterAndSortDetectedFaces([]).length === 0);
    });

    test('it should filter faces with score under the threshold', function() {
      assert.ok(this.focus.filterAndSortDetectedFaces([
      {
        score: 20,
        bounds: {
          height: 100,
          width: 100
        }
      },
      {
        score: 40,
        bounds: {
          height: 100,
          width: 100
        }
      },
      {
        score: 80,
        bounds: {
          height: 100,
          width: 100
        }
      }
      ]).length === 1);
    });

    test('it should sort faces by area', function() {
      var sortedFaces = this.focus.filterAndSortDetectedFaces([
        {
          id: 1,
          score: 80,
          bounds: {
            height: 100,
            width: 100
          }
        },
        {
          id: 2,
          score: 80,
          bounds: {
            height: 200,
            width: 200
          }
        },
        {
          id: 3,
          score: 80,
          bounds: {
            height: 300,
            width: 300
          }
        }
      ]);
      assert.ok(sortedFaces[0].id === 3);
      assert.ok(sortedFaces[1].id === 2);
      assert.ok(sortedFaces[2].id === 1);
    });

  });

  suite('Focus#focusOnLargestFace', function() {

    setup(function() {
      this.sandbox.spy(this.focus, 'onFacesDetected');
      this.sandbox.spy(this.focus, 'stopContinuousFocus');
      this.sandbox.spy(this.focus, 'updateFocusArea');
      this.sandbox.spy(this.focus, 'suspendFaceDetection');
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('it should not focus on any face if touch to focus is not available', function() {
      this.focus.focusOnLargestFace([]);
      assert.ok(!this.focus.onFacesDetected.called);
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.updateFocusArea.called);
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
      assert.ok(!this.focus.suspendFaceDetection.called);
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.updateFocusArea.called);
    });

    test('it should not focus on any face if faces have been already detected and we are focused on a face', function() {
      this.focus.touchFocus = true;
      this.focus.faceDetectionSuspended = false;
      this.focus.faceFocused = true;
      this.focus.detectedFaces = [{
        id: 1,
        score: 80,
        bounds: {
          height: 300,
          width: 300
        }
      }];
      this.focus.focusOnLargestFace([{
        id: 3,
        score: 80,
        bounds: {
          height: 300,
          width: 300
        }
      }]);
      assert.ok(this.focus.detectedFaces[0].id === 1);
      assert.ok(!this.focus.suspendFaceDetection.called);
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.updateFocusArea.called);
      assert.ok(this.focus.onFacesDetected.called);
    });


    test('it should not focus on any face if faces haven not been already detected and we are not already focused on a face', function() {
      this.focus.touchFocus = true;
      this.focus.faceDetectionSuspended = false;
      this.focus.faceFocused = false;
      this.focus.detectedFaces = [];
      this.focus.focusOnLargestFace([{
        id: 3,
        score: 80,
        bounds: {
          height: 300,
          width: 300
        }
      }]);
      assert.ok(this.focus.detectedFaces[0].id === 3);
      assert.ok(this.focus.suspendFaceDetection.called);
      assert.ok(this.focus.stopContinuousFocus.called);
      assert.ok(this.focus.updateFocusArea.called);
      assert.ok(this.focus.onFacesDetected.called);
    });

  });

  suite('Focus#focus()', function() {
    setup(function() {
      this.focus.focusMode = 'auto';
    });

    test('mozCamera autoFocus is called if focus mode is auto', function() {
      this.mozCamera.focusMode = 'auto';
      this.focus.focus(function() {});
      assert.ok(this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus is called if focus mode is continuous-picture', function() {
      this.mozCamera.focusMode = 'continuous-picture';
      this.focus.focus(function() {});
      assert.ok(this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus is not called if focus mode is neither auto nor continuous-picture', function() {
      this.mozCamera.focusMode = 'infinity';
      this.focus.focus(function() {});
      assert.ok(!this.mozCamera.autoFocus.called);
    });

    test('mozCamera autoFocus callback is called with error and focus state switches to false', function() {
      var onFocused = sinon.spy();
      this.mozCamera.autoFocus = sinon.stub();
      this.mozCamera.focusMode = 'auto';
      this.mozCamera.autoFocus.callsArgWith(0, undefined);
      this.focus.focus(onFocused);
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
      assert.ok(!this.mozCamera.autoFocus.called);
      assert.ok(previousFocusState === this.focus.focused);
    });

  });

  suite('Focus#stop()', function() {
    setup(function() {
      this.focus.stopContinuousFocus = sinon.spy();
      this.focus.stopFaceDetection = sinon.spy();
    });

    test('Should stop face detection and continuous focus', function() {
      this.focus.stop();
      assert.ok(this.focus.stopContinuousFocus.called);
      assert.ok(this.focus.stopFaceDetection.called);
    });
  });

  suite('Focus#reset()', function() {
    test('metering areas and focus areas are reset if touch focus enabled', function() {
      this.focus.touchFocus = true;
      this.focus.reset();
      assert.ok(this.focus.mozCamera.setFocusAreas.calledWith([]));
      assert.ok(this.focus.mozCamera.setMeteringAreas.calledWith([]));
    });

    test('metering areas and focus areas are not reset if touch focus disabled', function() {
      this.focus.touchFocus = false;
      this.focus.reset();
      assert.ok(!this.focus.mozCamera.setFocusAreas.called);
      assert.ok(!this.focus.mozCamera.setMeteringAreas.called);
    });
  });

  suite('Focus#resume()', function() {
    setup(function() {
      this.focus.resumeContinuousFocus = sinon.spy();
    });

    test('resumeContinuousFocus called if focus mode is continuous-picture', function() {
      this.focus.mozCamera.focusMode = 'continuous-picture'
      this.focus.resume();
      assert.ok(this.focus.resumeContinuousFocus.called);
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
    });

    test('it returns without doing anything if touch to focus disabled', function() {
      this.focus.touchFocus = false;
      this.focus.updateFocusArea();
      assert.ok(!this.focus.stopContinuousFocus.called);
      assert.ok(!this.focus.stopFaceDetection.called);
      assert.ok(!this.focus.mozCamera.setFocusAreas.called);
      assert.ok(!this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(!this.focus.focus.called);
    });

    test('it updates focus area if touch to focus is enabled', function() {
      this.focus.touchFocus = true;
      this.focus.updateFocusArea();
      assert.ok(this.focus.stopContinuousFocus.called);
      assert.ok(this.focus.stopFaceDetection.called);
      assert.ok(this.focus.mozCamera.setFocusAreas.called);
      assert.ok(this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(this.focus.focus.called);
    });

  });

});