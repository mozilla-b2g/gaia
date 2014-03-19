suite('controllers/battery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/battery',
      'lib/settings',
      'views/notification'
    ], function(
      App, Camera, BatteryController, Settings, NotificationViews) {
      self.BatteryController = BatteryController.BatteryController;
      self.NotificationViews = NotificationViews;
      self.Settings = Settings;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.lowbattery = sinon.createStubInstance(this.Settings);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationViews)
    };

    // For convenience
    this.camera = this.app.camera;

    // Our test instance
    this.batteryController = new this.BatteryController(this.app);
  });

  suite('BatteryController()', function() {
    test('Should listen to the following events', function() {
      this.batteryController = new this.BatteryController(this.app);
      assert.ok(this.app.on.calledWith('settings:configured'));
    });

    test('should call app.set with batteryStatus and battery charging' +
        ' on onLevelChange', function() {
      this.batteryController.battery = {
         charging: true
      };
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'charging'));
      assert.ok(!this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and low battery level' +
        ' on onLevelChange', function() {
      this.batteryController.battery = {
         level: 0.11
      };
      this.batteryController.low = 15;
      this.batteryController.app.get.returns('charging');
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'low'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and verylow battery' +
          ' level on onLevelChange', function() {
      this.batteryController.battery = {
         level: 0.10
      };
      this.batteryController.verylow = 10;
      this.batteryController.app.get.returns('low');
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'verylow'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and critical battery' +
        ' level on onLevelChange', function() {
      this.batteryController.battery = {
         level: 0.06
      };
      this.batteryController.critical = 6;
      this.batteryController.app.get.returns('verylow');
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'critical'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and battery shutdown' +
        ' level on onLevelChange', function() {
      this.batteryController.battery = {
         level: 0.05
      };
      this.batteryController.shutdown = 5;
      this.batteryController.app.get.returns('critical');
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'shutdown'));
      assert.ok(!this.app.views.notification.showNotification.called);
      assert.ok(this.app.views.notification.hideNotification.called);
    });

    test('should call app.set with batteryStatus and battery healthy' +
        ' level on onLevelChange', function() {
      this.batteryController.battery = {
         level: 1
      };
      this.batteryController.healthy = 100;
      this.batteryController.app.get.returns('charging');
      this.batteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
      assert.ok(!this.app.views.notification.showNotification.called);
    });
  });
});
