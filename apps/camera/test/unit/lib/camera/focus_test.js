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
    // Fake mozCamera
    this.mozCamera = {
      capabilities: {
        focusModes : ["auto", "infinity", "normal",
          "macro", "continuous-picture", "continuous-video" ]
      },
      autoFocus: sinon.stub(),
      setFocusAreas: sinon.stub(),
      setMeteringAreas: sinon.stub(),
      resumeContinuousFocus: sinon.stub()
    };
  });

  suite('Focus#configure()', function() {
    setup(function() {
      this.focus = new this.Focus({});
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

  suite('Focus#configureFocusModes()', function() {
    setup(function() {
      var userPreferences = {
        touchFocus: true
      };
      this.focus = new this.Focus(userPreferences);
      this.focus.isTouchFocusSupported = sinon.stub();
      this.focus.isTouchFocusSupported.returns(true);
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

  });

  suite('Focus#focus()', function() {
    setup(function() {
      this.focus = new this.Focus({});
      this.focus.focusMode = 'auto';
      this.focus.mozCamera = this.mozCamera;
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
      assert.ok(onFocused.calledWith(undefined));
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

  suite('Focus#reset()', function() {
    setup(function() {
      this.focus.mozCamera = this.mozCamera;
    });

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
      this.focus.mozCamera = this.mozCamera;
    });

    test('resumeContinuousFocus called if focus mode is continuous-picture', function() {
      this.focus.mozCamera.focusMode = 'continuous-picture'
      this.focus.resume();
      assert.ok(this.focus.mozCamera.resumeContinuousFocus.called);
    });

    test('resumeContinuousFocus is not called if focus mode is not continuous-picture', function() {
      this.focus.mozCamera.focusMode = 'auto';
      this.focus.resume();
      assert.ok(!this.focus.mozCamera.resumeContinuousFocus.called);
    });
  });

  suite('Focus#isTouchFocusSupported()', function() {
    setup(function() {
      this.focus.mozCamera = this.mozCamera;
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

  suite('Focus#updateFocusArea()', function() {
    setup(function() {
      this.focus.focus = sinon.spy();
      this.focus.mozCamera = this.mozCamera;
    });

    test('it returns without doing anything if touch two focus disabled', function() {
      this.focus.touchFocus = false;
      this.focus.updateFocusArea();
      assert.ok(!this.focus.mozCamera.setFocusAreas.called);
      assert.ok(!this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(!this.focus.focus.called);
    });

    test('it updates focus area if touch two focus is enabled', function() {
      this.focus.touchFocus = true;
      this.focus.updateFocusArea();
      assert.ok(this.focus.mozCamera.setFocusAreas.called);
      assert.ok(this.focus.mozCamera.setMeteringAreas.called);
      assert.ok(this.focus.focus.called);
    });

  });

});