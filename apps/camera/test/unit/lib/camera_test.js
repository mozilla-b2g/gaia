
suite('camera', function() {
  'use strict';

  var require = window.req;
  var Camera;

  suiteSetup(function(done) {
    require(['lib/camera'], function(_camera) {
      Camera = _camera;
      done();
    });
  });

  suite('Camera#focus', function() {
    setup(function() {
      this.camera = {
        autoFocus: {},
        set: sinon.spy(),
        mozCamera: { autoFocus: sinon.stub() },
        focus: Camera.prototype.focus
      };

      this.clock = sinon.useFakeTimers();
    });

    teardown(function() {
      this.clock.restore();
    });

    test('Should not call mozCamera.autoFocus if not supported', function() {
      var done = sinon.spy();
      this.camera.autoFocus.auto = false;
      this.camera.focus(done);
      assert.ok(!this.camera.mozCamera.autoFocus.called);
      assert.ok(done.called);
    });

    test('Should call to focus the camera if supported', function() {
      var done = sinon.spy();

      this.camera.autoFocus.auto = true;
      this.camera.mozCamera.autoFocus.callsArgWith(0, true);

      this.camera.focus(done);

      // Check the focus state was first set to 'focusing'
      assert.ok(this.camera.set.args[0][0] === 'focus');
      assert.ok(this.camera.set.args[0][1] === 'focusing');

      // Check the call to `autoFocus` was made
      assert.ok(this.camera.mozCamera.autoFocus.called);

      // Check the second focus state was then set to 'focused'
      assert.ok(this.camera.set.args[1][0] === 'focus');
      assert.ok(this.camera.set.args[1][1] === 'focused');

      // The callback
      assert.ok(done.called, 'callback called');
    });

    test('Should repond correctly on focus failure', function() {
      var done = sinon.spy();

      this.camera.autoFocus.auto = true;
      this.camera.mozCamera.autoFocus.callsArgWith(0, false);

      this.camera.focus(done);

      // Check the focus state was first set to 'focusing'
      assert.ok(this.camera.set.args[0][0] === 'focus');
      assert.ok(this.camera.set.args[0][1] === 'focusing');

      // Check the call to `autoFocus` was made
      assert.ok(this.camera.mozCamera.autoFocus.called);

      // Check the second focus state was then set to 'focused'
      assert.ok(this.camera.set.args[1][0] === 'focus');
      assert.ok(this.camera.set.args[1][1] === 'fail');

      // The callback
      assert.ok(done.calledWith('failed'));

      this.clock.tick(1001);
      assert.ok(this.camera.set.calledWith('focus', 'none'));
    });
  });
});
