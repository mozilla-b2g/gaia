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
        hdr: sinon.createStubInstance(this.Setting),
        timer: sinon.createStubInstance(this.Setting),
        indicators: sinon.createStubInstance(this.Setting)
      },
      on: sinon.spy(),
      views: {
        indicators: sinon.createStubInstance(this.IndicatorsView)
      }
    };

    this.settings = this.app.settings;
    this.settings.hdr.selected.returns('on');
    this.settings.timer.selected.returns('on');

    sinon.spy(this.IndicatorsController.prototype, 'bindEvents');

    this.enabled = {
      timer: true,
      hdr: true,
      geolocation: true,
      battery: true
    };

    this.app.settings.indicators.get.withArgs('enabled').returns(this.enabled);
  });

  teardown(function() {
    this.IndicatorsController.prototype.bindEvents.restore();
  });

  suite('IndicatorsController()', function() {
    test('Should bind settings change events', function() {
      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);

      assert.ok(this.app.settings.timer.on.calledWith('change:selected'));
      assert.ok(this.app.settings.hdr.on.calledWith('change:selected'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('settings:configured'));
    });
  });

  suite('IndicatorsController#onSettingsConfigured()', function() {
    test('Should set the current \'hdr\' and \'timer\' keys' +
         'on the view', function() {
      var view = this.app.views.indicators;

      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      this.controller.updateGeolocationStatus = sinon.spy();
      this.controller.onSettingsConfigured();

      assert.ok(view.set.calledWith('timer', 'on'));
      assert.ok(view.set.calledWith('hdr', 'on'));
    });
  });

  suite('IndicatorsController#enable()', function() {
    setup(function() {
      this.controller = new this.IndicatorsController(this.app);
    });

    test('Should should enable if per config if not a setting', function() {
      this.controller.enable('noSetting', true);
      assert.ok(this.controller.view.enable.calledWith('noSetting', true));
      this.controller.view.enable.reset();

      this.controller.enable('noSetting', false);
      assert.ok(this.controller.view.enable.calledWith('noSetting', false));
    });

    test('Should should not enable if setting not supported', function() {
      this.settings.hdr.supported.returns(false);
      this.controller.enable('hdr', true);
      assert.ok(this.controller.view.enable.calledWith('hdr', false));
      this.controller.view.enable.reset();

      this.settings.hdr.supported.returns(true);
      this.controller.enable('hdr', true);
      assert.ok(this.controller.view.enable.calledWith('hdr', true));
    });
  });
});
