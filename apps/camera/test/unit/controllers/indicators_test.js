suite('controllers/indicators', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'controllers/indicators',
      'views/indicators',
      'lib/setting'
    ], function(IndicatorsController, IndicatorsView, Setting) {
      self.IndicatorsController = IndicatorsController.IndicatorsController;
      self.IndicatorsView = IndicatorsView;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.app = {
      settings: {
        showIndicators: sinon.createStubInstance(this.Setting),
        hdr: sinon.createStubInstance(this.Setting),
        timer: sinon.createStubInstance(this.Setting),
        indicators: sinon.createStubInstance(this.Setting)
      },
      on: sinon.spy(),
      views: {
        indicators: sinon.createStubInstance(this.IndicatorsView)
      }
    };
    this.app.geolocation = {
      on: sinon.spy()
    };
    this.app.settings.showIndicators.selected.returns(true);
    this.app.settings.hdr.selected.returns('on');
    this.app.settings.timer.selected.returns('on');
    sinon.spy(this.IndicatorsController.prototype, 'bindEvents');
    this.enabledValues = {
      timer: true,
      hdr: true,
      geolocation: true,
      battery: true
    };
  });

  teardown(function() {
    this.IndicatorsController.prototype.bindEvents.restore();
  });

  suite('IndicatorsController()', function() {
    test('Should only show indicators if pref on', function() {
      var bindEvents = this.IndicatorsController.prototype.bindEvents;
      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      assert.ok(bindEvents.called);
      bindEvents.reset();
      this.app.settings.indicators.get.returns(null);
      this.app.settings.showIndicators.selected.returns(false);
      this.controller = new this.IndicatorsController(this.app);
      assert.ok(!bindEvents.called);
    });

    test('Should bind settings change events', function() {
      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      assert.ok(this.app.settings.timer.on.calledWith('change:selected'));
      assert.ok(this.app.settings.hdr.on.calledWith('change:selected'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('settings:configured',
                this.controller.configure));
    });
  });

  suite('IndicatorsController#configure()', function() {
    test('Should set the current \'hdr\' and \'timer\' keys' +
         'on the view', function() {
      var view = this.app.views.indicators;
      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      this.controller.updateGeolocationStatus = sinon.spy();
      this.controller.configure();
      assert.ok(view.set.calledWith('timer', 'on'));
      assert.ok(view.set.calledWith('hdr', 'on'));
      assert.ok(this.controller.updateGeolocationStatus.called);
    });
  });

  suite('IndicatorsController#updateGeolocationStatus()', function() {
    setup(function() {
      this.controller = new this.IndicatorsController(this.app);
    });

    test('Should set the geotagging \'on\'', function() {
      this.controller.updateGeolocationStatus(true);
      assert.ok(this.controller.indicators.set.calledWith('geotagging', 'on'));
    });

    test('Should set the geotagging \'off\'', function() {
      this.controller.updateGeolocationStatus(false);
      assert.ok(this.controller.indicators.set.calledWith('geotagging', 'off'));
    });

  });
});
