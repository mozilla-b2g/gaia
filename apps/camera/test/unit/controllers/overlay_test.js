/*jshint maxlen:false*/
'use strict';

suite('controllers/overlay', function() {
  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'controllers/overlay',
      'views/overlay'
    ], function(App, controller, Overlay) {
      self.Controller = controller;
      self.Overlay = Overlay;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.activity = {
      pick: false,
      cancel: sinon.spy()
    };
    this.app.localized.returns(true);
    this.app.require = sinon.stub();
    this.app.require.callsArgWith(1, this.Overlay);

    this.controller = new this.Controller(this.app);
  });

  suite('OverlayController()', function() {
    test('Should bind to events', function() {
      assert.ok(this.app.on.calledWith('storage:changed'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('camera:requesting'));
      assert.ok(this.app.on.calledWith('camera:error'));
    });
  });

  suite('OverlayController#onStorageChanged()', function() {
    setup(function() {
      sinon.stub(this.controller, 'updateOverlay');
    });

    test('Should *not* insert a new overlay', function() {
      this.controller.onStorageChanged('available');
      sinon.assert.calledWith(this.controller.updateOverlay, 'storage', false, 'available');
    });

    test('Should create overlay whenever the value is not \'available\'', function() {
      this.controller.onStorageChanged('foo');
      sinon.assert.calledWith(this.controller.updateOverlay, 'storage', true, 'foo');
    });
  });

  suite('OverlayController#onBatteryChanged()', function() {
    setup(function() {
      sinon.stub(this.controller, 'updateOverlay');
    });

    test('Should create overlay if status is shutdown', function() {
      this.controller.onBatteryChanged('shutdown');
      sinon.assert.calledWith(this.controller.updateOverlay, 'battery', true, 'shutdown');
    });

    test('Should destroy overlay if previous is shutdown', function() {
      this.controller.onBatteryChanged('foo');
      sinon.assert.calledWith(this.controller.updateOverlay, 'battery', false, 'foo');
    });
  });

  suite('OverlayController#onCameraRequesting()', function() {
    setup(function() {
      sinon.stub(this.controller, 'updateOverlay');
    });

    test('Should destroy overlay', function() {
      this.controller.onCameraRequesting();
      sinon.assert.calledWith(this.controller.updateOverlay, 'cameraError', false);
    });
  });

  suite('OverlayController#onCameraError()', function() {
    setup(function() {
      sinon.stub(this.controller, 'updateOverlay');
    });

    test('Should create overlay', function() {
      this.controller.onCameraError('foo');
      sinon.assert.calledWith(this.controller.updateOverlay, 'cameraError', true, 'foo');
    });
  });

  suite('OverlayController#updateOverlay()', function() {
    setup(function() {
      this.OverlayProto = this.Overlay.prototype;
      sinon.spy(this.OverlayProto, 'initialize');
      sinon.stub(this.OverlayProto, 'appendTo', function() { return this; });
    });

    teardown(function() {
      this.OverlayProto.initialize.restore();
      this.OverlayProto.appendTo.restore();
    });

    test('Should not insert overlay when key is unknown', function() {
      this.controller.updateOverlay('storage', true, 'foobar');
      assert.isFalse(this.OverlayProto.appendTo.called);
    });

    test('Should insert overlay when key is known', function() {
      this.controller.updateOverlay('storage', true, 'unavailable');
      assert.isTrue(this.OverlayProto.appendTo.called);
    });

    test('Should not be closable if type is \'request-fail\'', function() {
      this.controller.updateOverlay('cameraError', true, 'request-fail');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);

      this.app.activity.pick = true;
      this.controller.updateOverlay('cameraError', true, 'request-fail');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should not be closable if activity not pending', function() {
      this.controller.updateOverlay('storage', true, 'unavailable');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should be closable only if activity is pending', function() {
      this.app.activity.pick = true;
      this.controller.updateOverlay('storage', true, 'unavailable');
      assert.isTrue(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should append the overlay to the body', function() {
      this.controller.updateOverlay('storage', true, 'unavailable');
      assert.isTrue(this.OverlayProto.appendTo.calledWith(document.body));
    });
  });
});
