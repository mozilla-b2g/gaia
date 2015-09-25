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
  });

  suite('OverlayController()', function() {
    test('Should bind to events', function() {
      this.controller = new this.Controller(this.app);
      assert.ok(this.app.on.calledWith('storage:changed'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('camera:requesting'));
      assert.ok(this.app.on.calledWith('camera:error'));
    });
  });

  suite('OverlayController#onStorageChanged()', function() {
    setup(function() {
      this.controller = new this.Controller(this.app);
      sinon.stub(this.controller, 'createOverlay');
    });

    test('Should *not* insert a new overlay', function() {
      this.controller.onStorageChanged('available');
      assert.isFalse(this.controller.createOverlay.called);
    });

    test('Should call createOverlay whenever the value is not \'available\'', function() {
      this.controller.onStorageChanged('foo');
      assert.isTrue(this.controller.createOverlay.calledWith('foo'));
    });
  });

  suite('OverlayController#onBatteryChanged()', function() {
    setup(function() {
      this.controller = new this.Controller(this.app);
      sinon.stub(this.controller, 'createOverlay');
    });

    test('Should call createOverlay if status is shutdown', function() {
      this.controller.previousOverlay = 'foo';
      this.controller.onBatteryChanged('shutdown');
      assert.isTrue(this.controller.createOverlay.calledWith('shutdown'));
    });

    test('Should call destroyOverlays if previous is shutdown', function() {
      this.controller.previousOverlay = 'shutdown';
      this.controller.onBatteryChanged('foo');
    });
  });

  suite('OverlayController#onCameraRequested()', function() {
    setup(function() {
      this.controller = new this.Controller(this.app);
      sinon.stub(this.controller, 'createOverlay');
    });

    test('Should call destroyOverlay if previous error', function() {
      var destroy = sinon.spy();
      this.controller.cameraErrorOverlay = {
        destroy: destroy
      };

      this.controller.onCameraRequesting();
      assert.isTrue(destroy.called);
    });

    test('Should insert a new overlay', function() {
      this.controller.onCameraError('request-fail');
      assert.isTrue(this.controller.createOverlay.calledWith('request-fail'));
    });
  });

  suite('OverlayController#createOverlay()', function() {
    setup(function() {
      this.OverlayProto = this.Overlay.prototype;
      sinon.stub(this.OverlayProto, 'initialize');
      sinon.stub(this.OverlayProto, 'appendTo', function() { return this; });
      this.controller = new this.Controller(this.app);
    });

    teardown(function() {
      this.OverlayProto.initialize.restore();
      this.OverlayProto.appendTo.restore();
    });

    test('Should not insert overlay when key is unknown', function() {
      this.controller.createOverlay('foobar');
      assert.isFalse(this.OverlayProto.initialize.called);
    });

    test('Should insert overlay when key is known', function() {
      this.controller.createOverlay('unavailable');
      assert.isTrue(this.OverlayProto.appendTo.called);
    });

    test('Should not be closable if type is \'request-fail\'', function() {
      this.controller.createOverlay('request-fail');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);

      this.app.activity.pick = true;
      this.controller.createOverlay('request-fail');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should not be closable if activity not pending', function() {
      this.controller.createOverlay('unavailable');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should be closable only if activity is pending', function() {
      this.app.activity.pick = true;
      this.controller.createOverlay('unavailable');
      assert.isTrue(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should append the overlay to the body', function() {
      this.controller.createOverlay('unavailable');
      assert.isTrue(this.OverlayProto.appendTo.calledWith(document.body));
    });
  });

  suite('OverlayController#getOverlayData()', function() {
    setup(function() {
      this.controller = new this.Controller(this.app);
    });

    test('Should return correct data for \'unavailable\'', function() {
      var output = this.controller.getOverlayData('unavailable');
      assert.equal(output.title, 'nocard2-title');
      assert.equal(output.body, 'nocard3-text');
    });

    test('Should return correct data for \'nospace\'', function() {
      var output = this.controller.getOverlayData('nospace');
      assert.equal(output.title, 'nospace2-title');
      assert.equal(output.body, 'nospace2-text');
    });

    test('Should return correct data for \'shared\'', function() {
      var output = this.controller.getOverlayData('shared');
      assert.equal(output.title, 'pluggedin2-title');
      assert.equal(output.body, 'pluggedin2-text');
    });

    test('Should return correct data for \'request-fail\'', function() {
      var output = this.controller.getOverlayData('request-fail');
      assert.equal(output.title, 'camera-unavailable-title');
      assert.equal(output.body, 'camera-unavailable-text');
    });

    test('Should return false for unknown key', function() {
      var output = this.controller.getOverlayData('something-not-known');
      assert.equal(output, false);
    });
  });
});
