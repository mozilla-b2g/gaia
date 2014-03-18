suite('controllers/low-battery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/low-battery',
      'lib/settings',
      'views/notification'
    ], function(
      App, Camera, LowBatteryController, Settings, NotificationViews) {
      self.LowBatteryController = LowBatteryController.LowBatteryController;
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
    this.lowBatteryController = new this.LowBatteryController(this.app);
  });

  suite('LowBatteryController()', function() {
    test('Should listen to the following events', function() {
      this.lowBatteryController = new this.LowBatteryController(this.app);
      assert.ok(this.app.on.calledWith('settings:configured'));
    });

    test('should call app.emit with batteryStatus and battery charging' +
        ' on onLevelChange', function() {
      this.lowBatteryController.battery = {
         charging: true
      };
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'charging'));
      assert.ok(!this.app.views.notification.showNotification.called);
      assert.ok(this.app.views.notification.clearPersistent.called);
    });

    test('should call app.set with batteryStatus and low battery level' +
        ' on onLevelChange', function() {
      this.lowBatteryController.battery = {
         level: 0.11
      };
      this.lowBatteryController.low = 15;
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'low'));
      assert.ok(this.app.views.notification.showNotification.called);
      assert.ok(this.app.views.notification.clearPersistent.called);
    });

    test('should call app.set with batteryStatus and verylow battery' +
          ' level on onLevelChange', function() {
      this.lowBatteryController.battery = {
         level: 0.10
      };
      this.lowBatteryController.verylow = 10;
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'verylow'));
      assert.ok(this.app.views.notification.showNotification.called);
      assert.ok(this.app.views.notification.clearPersistent.called);
    });

    test('should call app.set with batteryStatus and critical battery' +
        ' level on onLevelChange', function() {
      this.lowBatteryController.battery = {
         level: 0.06
      };
      this.lowBatteryController.critical = 6;
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'critical'));
      assert.ok(this.app.views.notification.showNotification.called);
    });

    test('should call app.set with batteryStatus and battery shutdown' +
        ' level on onLevelChange', function() {
      this.lowBatteryController.battery = {
         level: 0.05
      };
      this.lowBatteryController.shutdown = 5;
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'shutdown'));
      assert.ok(this.app.views.notification.clearPersistent.called);
    });

    test('should call app.emit with batteryStatus and battery healthy' +
        ' level on onLevelChange', function() {
      this.lowBatteryController.battery = {
         level: 1
      };
      this.lowBatteryController.healthy = 100;
      this.lowBatteryController.onLevelChange();
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
      assert.ok(this.app.views.notification.clearPersistent.called);
    });
  });
});
