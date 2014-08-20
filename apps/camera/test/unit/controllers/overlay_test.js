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

    this.app.l10nGet.withArgs('nocard2-title').returns('nocard title');
    this.app.l10nGet.withArgs('nocard3-text').returns('nocard body');
    this.app.l10nGet.withArgs('nospace2-title').returns('nospace title');
    this.app.l10nGet.withArgs('nospace2-text').returns('nospace body');
    this.app.l10nGet.withArgs('pluggedin2-title').returns('pluggedin title');
    this.app.l10nGet.withArgs('pluggedin2-text').returns('pluggedin body');
  });

  suite('OverlayController()', function() {
    test('Should bind to the storage state change event', function() {
      this.controller = new this.Controller(this.app);
      assert.ok(this.app.on.calledWith('storage:changed'));
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

    test('Should show spinner if the application is not localized', function() {
      this.app.localized.returns(false);
      this.controller.createOverlay('shutdown');
      assert.isTrue(this.app.showLoading.called);
    });

  });

  suite('OverlayController#getOverlayData()', function() {
    setup(function() {
      this.controller = new this.Controller(this.app);
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
});
