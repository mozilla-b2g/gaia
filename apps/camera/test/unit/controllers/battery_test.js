suite('controllers/battery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'controllers/battery',
      'lib/settings',
      'views/notification'
    ], function(
      App, BatteryController, Settings, NotificationView) {
      self.BatteryController = BatteryController.BatteryController;
      self.NotificationView = NotificationView;
      self.Settings = Settings;
      self.App = App;
      done();
    });
  });

  setup(function() {
    var levels = {
      low: 15,
      verylow: 10,
      critical: 6,
      shutdown: 5,
      healthy: 100
    };

    this.app = sinon.createStubInstance(this.App);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.battery = sinon.createStubInstance(this.Settings);
    this.app.settings.battery.get.withArgs('levels').returns(levels);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationView)
    };

    // Our test instance
    this.batteryController = new this.BatteryController(this.app);
  });

  suite('BatteryController()', function() {
    test('Should listen to the following events', function() {
      this.batteryController = new this.BatteryController(this.app);
      assert.ok(this.app.on.calledWith('settings:configured'));
    });
  });

  suite('BatteryController#updateStatus', function() {
    test('should call app.set with batteryStatus and battery charging' +
        ' on updateStatus', function() {
      this.batteryController.battery = { charging: true };
      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'charging'));
      assert.ok(!this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and low battery level' +
        ' on updateStatus', function() {
      this.batteryController.battery = { level: 0.11 };
      this.batteryController.app.get.withArgs('batteryStatus').returns('charging');

      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'low'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and verylow battery' +
          ' level on updateStatus', function() {
      this.batteryController.battery = { level: 0.10 };
      this.batteryController.app.get.withArgs('batteryStatus').returns('low');

      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'verylow'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and critical battery' +
        ' level on updateStatus', function() {
      this.batteryController.battery = { level: 0.06 };
      this.batteryController.app.get.withArgs('batteryStatus').returns('verylow');

      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'critical'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and battery shutdown' +
        ' level on updateStatus', function() {
      this.batteryController.battery = { level: 0.05 };
      this.batteryController.app.get.withArgs('batteryStatus').returns('critical');

      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'shutdown'));
      assert.ok(!this.app.views.notification.showNotification.called);
      assert.ok(this.app.views.notification.hideNotification.called);
    });

    test('should call app.set with batteryStatus and battery healthy' +
        ' level on updateStatus', function() {
      this.batteryController.battery = { level: 1 };
      this.batteryController.app.get.withArgs('batteryStatus').returns('charging');

      this.batteryController.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
      assert.ok(!this.app.views.notification.showNotification.called);
    });
  });
});
