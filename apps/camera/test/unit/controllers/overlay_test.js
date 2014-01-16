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
      'activity',
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
      camera: {
        state: {
          on: sinon.spy()
        },
        get: sinon.spy()
      },
      storage: {
        on: sinon.spy()
      },
      activity: new Activity()
    };

    navigator.mozL10n = { get: sinon.stub() };
    navigator.mozL10n.get.withArgs('nocard2-title').returns('nocard title');
    navigator.mozL10n.get.withArgs('nocard2-text').returns('nocard body');
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
      sinon.stub(this.controller, 'destroyOverlays');
      sinon.stub(this.controller, 'insertOverlay');
    });

    test('Should destroy any old storage overlays if storage' +
         'becomes available, and not insert a new overlay', function() {
      this.controller.onStorageStateChange('available');
      assert.isTrue(this.controller.destroyOverlays.calledOnce);
      assert.isFalse(this.controller.insertOverlay.called);
    });

    test('Should call insertOverlay whenever' +
         'the value is not \'available\'', function() {
      this.controller.onStorageStateChange('foo');
      assert.isFalse(this.controller.destroyOverlays.called);
      assert.isTrue(this.controller.insertOverlay.calledWith('foo'));
    });
  });

  suite('OverlayController#insertOverlay()', function() {
    setup(function() {
      this.OverlayProto = this.modules.Overlay.prototype;
      sinon.stub(this.OverlayProto, 'initialize');
      sinon.stub(this.OverlayProto, 'appendTo', function() { return this; });
      this.controller = new Controller(this.app);
      sinon.spy(this.controller.overlays, 'push');
    });

    teardown(function() {
      this.OverlayProto.initialize.restore();
      this.OverlayProto.appendTo.restore();
      this.controller.overlays.push.restore();
    });

    test('Should not insert overlay when key is unknown', function() {
      this.controller.insertOverlay('foobar');
      assert.isFalse(this.OverlayProto.initialize.called);
    });

    test('Should insert overlay when key is known', function() {
      this.controller.insertOverlay('unavailable');
      assert.isTrue(this.OverlayProto.appendTo.called);
    });

    test('Should not be closable only if not activity pending', function() {
      this.controller.insertOverlay('unavailable');
      assert.isFalse(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should be closable only if activity is pending', function() {
      this.app.activity.active = true;
      this.controller.insertOverlay('unavailable');
      assert.isTrue(this.OverlayProto.initialize.args[0][0].closable);
    });

    test('Should append the overlay to the body', function() {
      this.controller.insertOverlay('unavailable');
      assert.isTrue(this.OverlayProto.appendTo.calledWith(document.body));
    });

    test('Should add the overlay to the overlays array', function() {
      var OverlayView = this.modules.Overlay;
      assert.isFalse(this.controller.overlays.push.called);
      this.controller.insertOverlay('unavailable');
      assert.isTrue(
        this.controller.overlays.push.args[0][0] instanceof OverlayView);
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

  suite('OverlayController#onStorageSettingsClick()', function() {});

  suite('OverlayController#destroyOverlays()', function() {
    setup(function() {
      this.controller = new Controller(this.app);

      this.overlay1 = { destroy: sinon.spy() };
      this.overlay2 = { destroy: sinon.spy() };

      this.controller.overlays = [
        this.overlay1,
        this.overlay2
      ];
    });

    test('Should call destroy on each overlay in' +
         'the overlays list', function() {
      this.controller.destroyOverlays();
      assert.isTrue(this.overlay1.destroy.called);
      assert.isTrue(this.overlay2.destroy.called);
    });

    test('Should empty the list', function() {
      assert.ok(this.controller.overlays.length === 2);
      this.controller.destroyOverlays();
      assert.ok(this.controller.overlays.length === 0);
    });
  });
});
