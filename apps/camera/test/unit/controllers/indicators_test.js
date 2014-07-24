suite('controllers/indicators', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'controllers/indicators',
      'views/indicators',
      'lib/setting',
      'app'
    ], function(IndicatorsController, IndicatorsView, Setting, App) {
      self.IndicatorsController = IndicatorsController.IndicatorsController;
      self.IndicatorsView = IndicatorsView;
      self.Setting = Setting;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.settings = {
      hdr: sinon.createStubInstance(this.Setting),
      timer: sinon.createStubInstance(this.Setting),
      indicators: sinon.createStubInstance(this.Setting)
    };
    this.app.views = {
      indicators: sinon.createStubInstance(this.IndicatorsView)
    };

    // Shortcuts
    this.view = this.app.views.indicators;
    this.settings = this.app.settings;

    // Return values
    this.settings.hdr.selected.returns('on');
    this.settings.timer.selected.returns('on');
    this.app.get.withArgs('batteryStatus').returns('healthy');

    // Create our test instance
    this.controller = new this.IndicatorsController(this.app);
  });

  suite('IndicatorsController()', function() {
    test('Should bind settings change events', function() {
      assert.ok(this.app.settings.timer.on.calledWith('change:selected'));
      assert.ok(this.app.settings.hdr.on.calledWith('change:selected'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('settings:configured'));
    });

    test('It sets the battery status initially', function() {
      sinon.assert.calledWith(this.view.set, 'battery', 'healthy');
    });

    test('It sets hdr status initially', function() {
      sinon.assert.calledWith(this.view.set, 'hdr', 'on');
    });

    test('It sets timer status initially', function() {
      sinon.assert.calledWith(this.view.set, 'timer', 'on');
    });

    test('It reconfigures when the settings change', function() {
      sinon.assert.calledWith(this.app.on, 'settings:configured', this.controller.configure);
    });
  });

  suite('IndicatorsController#configure()', function() {
    test('Should set the current \'hdr\' and \'timer\' keys' +
         'on the view', function() {
      var view = this.app.views.indicators;

      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      this.controller.configure();

      assert.ok(view.set.calledWith('timer', 'on'));
      assert.ok(view.set.calledWith('hdr', 'on'));
    });
  });
});
