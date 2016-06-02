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
      mode: sinon.createStubInstance(this.Setting),
      countdown: sinon.createStubInstance(this.Setting),
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
    this.settings.countdown.selected.returns('on');
    this.app.get.withArgs('batteryStatus').returns('healthy');

    // Create our test instance
    this.controller = new this.IndicatorsController(this.app);
  });

  suite('IndicatorsController()', function() {
    test('Should bind settings change events', function() {
      assert.ok(this.app.settings.countdown.on.calledWith('change:selected'));
      assert.ok(this.app.settings.mode.on.calledWith('change:selected'));
      assert.ok(this.app.settings.hdr.on.calledWith('change:selected'));
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('settings:configured'));
      assert.ok(this.app.on.calledWith('settings:opened'));
      assert.ok(this.app.on.calledWith('settings:closed'));

      assert.ok(this.app.on.calledWith('previewgallery:opened',
        this.view.hide));
      assert.ok(this.app.on.calledWith('previewgallery:closed',
        this.view.show));
    });

    test('It sets the battery status initially', function() {
      sinon.assert.calledWith(this.view.set, 'battery', 'healthy');
    });

    test('It sets hdr status initially', function() {
      sinon.assert.calledWith(this.view.set, 'hdr', 'on');
    });

    test('It sets countdown status initially', function() {
      sinon.assert.calledWith(this.view.set, 'countdown', 'on');
    });

    test('It reconfigures when the settings change', function() {
      sinon.assert.calledWith(this.app.on, 'settings:configured', this.controller.configure);
    });

    test('It binds view setter for aria-hidden true', function() {
      sinon.assert.calledWith(this.view.setter, 'ariaHidden', true);
    });

    test('It binds view setter for aria-hidden false', function() {
      sinon.assert.calledWith(this.view.setter, 'ariaHidden', false);
    });
  });

  suite('IndicatorsController#configure()', function() {
    test('Should set the current \'hdr\' and \'countdown\' keys' +
         'on the view', function() {
      var view = this.app.views.indicators;

      this.app.settings.indicators.get.returns(this.enabledValues);
      this.controller = new this.IndicatorsController(this.app);
      this.controller.configure();

      assert.ok(view.set.calledWith('countdown', 'on'));
      assert.ok(view.set.calledWith('hdr', 'on'));
    });
  });
});
