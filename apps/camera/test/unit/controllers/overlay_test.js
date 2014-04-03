/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/overlay', function() {
  var Controller;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/overlay',
      'lib/activity',
      'views/overlay'
    ], function(controller, activity, Overlay) {
      Controller = self.modules.controller = controller;
      self.modules.activity = activity;
      self.modules.Overlay = Overlay;
      done();
    });
  });

  setup(function() {
    var Activity = this.modules.activity;

    this.app = {
      on: sinon.spy(),
      camera: {
        get: sinon.spy()
      },
      storage: {
        on: sinon.spy()
      },
      activity: new Activity()
    };

    navigator.mozL10n = { get: sinon.stub() };
    navigator.mozL10n.get.withArgs('nocard2-title').returns('nocard title');
    navigator.mozL10n.get.withArgs('nocard3-text').returns('nocard body');
    navigator.mozL10n.get.withArgs('nospace2-title').returns('nospace title');
    navigator.mozL10n.get.withArgs('nospace2-text').returns('nospace body');
    navigator.mozL10n.get.withArgs(
      'pluggedin-title').returns('pluggedin title');
    navigator.mozL10n.get.withArgs('pluggedin-text').returns('pluggedin body');
  });

  teardown(function() {
    delete navigator.mozL10n;
  });

  suite('OverlayController()', function() {
    test('Should bind to the storage state change event', function() {
      this.controller = new Controller(this.app);
      assert.ok(this.app.storage.on.calledWith('statechange'));
    });
  });

  suite('OverlayController#onStorageStateChange()', function() {
    setup(function() {
      this.controller = new Controller(this.app);
      sinon.stub(this.controller, 'createOverlay');
    });

    test('Should *not* insert a new overlay', function() {
      this.controller.onStorageStateChange('available');
      assert.isFalse(this.controller.createOverlay.called);
    });

    test('Should call createOverlay whenever the value is not \'available\'', function() {
      this.controller.onStorageStateChange('foo');
      assert.isTrue(this.controller.createOverlay.calledWith('foo'));
    });
  });

  suite('OverlayController#createOverlay()', function() {
    setup(function() {
      this.OverlayProto = this.modules.Overlay.prototype;
      sinon.stub(this.OverlayProto, 'initialize');
      sinon.stub(this.OverlayProto, 'appendTo', function() { return this; });
      this.controller = new Controller(this.app);
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

    test('Should not be closable only if not activity pending', function() {
      this.controller.createOverlay('unavailable');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should be closable only if activity is pending', function() {
      this.app.activity.active = true;
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
      this.controller = new Controller(this.app);
    });

    test('Should return correct data for \'unavailable\'', function() {
      var output = this.controller.getOverlayData('unavailable');
      assert.equal(output.title, 'nocard title');
      assert.equal(output.body, 'nocard body');
    });

    test('Should return correct data for \'nospace\'', function() {
      var output = this.controller.getOverlayData('nospace');
      assert.equal(output.title, 'nospace title');
      assert.equal(output.body, 'nospace body');
    });

    test('Should return correct data for \'shared\'', function() {
      var output = this.controller.getOverlayData('shared');
      assert.equal(output.title, 'pluggedin title');
      assert.equal(output.body, 'pluggedin body');
    });

    test('Should return false for unknown key', function() {
      var output = this.controller.getOverlayData('something-not-known');
      assert.equal(output, false);
    });
  });

  suite('OverlayController#onBatteryStatusChange()', function() {
    setup(function() {
      this.controller = new Controller(this.app);
      sinon.stub(this.controller, 'createOverlay');
    });

    test('Should call createOverlay if status is shutdown', function() {
      this.controller.previousOverlay = 'foo';
      this.controller.onBatteryStatusChange('shutdown');
      assert.isTrue(this.controller.createOverlay.calledWith('shutdown'));
    });

    test('Should call destroyOverlays if previous is shutdown', function() {
      this.controller.previousOverlay = 'shutdown';
      this.controller.onBatteryStatusChange('foo');
    });
  });
});
