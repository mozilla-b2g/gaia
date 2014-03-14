suite('controllers/notification', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'lib/activity',
      'controllers/notification',
      'lib/settings',
      'views/notification',
      'vendor/view',
      'lib/find',
      'lib/orientation'
    ], function(
      App, Camera, Activity, NotificationController, Settings, NotificationView,
      VendorView, Find, Orientation) {
      self.NotificationController =
        NotificationController.NotificationController;
      self.NotificationView = NotificationView;
      self.Settings = Settings;
      self.Activity = Activity;
      self.VendorView = VendorView;
      self.Find = Find;
      self.Orientation = Orientation;
      self.Camera = Camera;
      self.App = App;
      
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationView)
    };
    this.app.settings = sinon.createStubInstance(this.Settings);
  });

  suite('NotificationController()', function() {
    setup(function() {
      navigator.mozL10n = navigator.mozL10n || function() {};
      navigator.mozL10n = {
        get: function(key) { return key;}
      };
    this.Controller = new this.NotificationController(this.app);
    });

    test('Should listen to the following bind events', function() {

      assert.ok(this.app.on.calledWith('battery:healthy'));
      assert.ok(this.app.on.calledWith('battery:critical'));
      assert.ok(this.app.on.calledWith('battery:low'));
      assert.ok(this.app.on.calledWith('battery:verylow'));
      assert.ok(this.app.on.calledWith('battery:shutdown'));
      assert.ok(this.app.on.calledWith('battery:charging'));
      assert.ok(this.app.on.calledWith('setting:notification'));
    });

    test('Check NotificationQueue on onSettingNotification', function() {
      this.message = 'Grid set On';
      sinon.stub(this.Controller, 'checkNotificationQueue');
      this.Controller.onSettingNotification(this.message);
      assert.isTrue(this.Controller.checkNotificationQueue.called);
    });

    test('Check NotificationQueue on onLowBattery', function() {
      this.lowBatteryObj = {
        message: 'battery-low-critical-6-text'
      };
      sinon.stub(this.Controller, 'checkNotificationQueue');
      this.Controller.onLowBattery(this.lowBatteryObj);
      assert.isTrue(this.Controller.checkNotificationQueue.called);
    });

    test('removePersistentNotification when isSticky is "true"', function() {
      this.lowBatteryObj = {
        message: 'battery-low-critical-6-text',
        title: '',
        events: 'battery:critical-6',
        icon: 'icon-battery-10',
        value: 6,
        isSticky: true
      };
      sinon.stub(this.Controller, 'removePersistentNotification');
      this.Controller.onLowBattery(this.lowBatteryObj);
      assert.isTrue(this.Controller.removePersistentNotification.called);
    });

    test('clear NotificationQueue when isSticky is "false"', function() {
      this.Controller.notification = [1, 2];
      this.lowBatteryObj = {
        isSticky: false
      };
      sinon.stub(this.Controller, 'clearNotificationQueue');
      this.Controller.onLowBattery(this.lowBatteryObj);
      assert.isTrue(this.Controller.clearNotificationQueue.called);
    });

   test('clear NotificationQueue on checkNotificationQueue method', function() {
     this.Controller.notification = [1, 2];
     sinon.stub(this.Controller, 'clearNotificationQueue');
     this.Controller.checkNotificationQueue();
     assert.isTrue(this.Controller.clearNotificationQueue.calledWith
      (this.Controller.notification[0]));
   });
  });
});
