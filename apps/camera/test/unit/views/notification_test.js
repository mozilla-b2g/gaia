suite('views/notification', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['views/notification'], function(NotificationView) {
      self.NotificationView = NotificationView;
      done();
    });
  });

  setup(function() {
    this.notification = new this.NotificationView();
  });

  suite('NotificationView#showNotification()', function() {
    setup(function() {
      sinon.stub(this.notification, '_clearTimeOut');
      sinon.stub(this.notification, '_clearMessage');
      sinon.stub(this.notification, '_showMessage');
    });

    test('Should clear the Message when isPersistent is \'true\'', function() {
      var options = {
        message: 'test',
        isPersistent: true
      };
      this.notification.showNotification(options);
      assert.ok(this.notification._clearMessage.called);
      assert.ok(!this.notification._clearTimeOut.called);
      assert.ok(!this.notification._showMessage.called);
    });

    test('Should show the Message when isPersistent is \'undefined\'', function() {
      var options = {
        message: 'test'
      };
      this.notification.showNotification(options);
      assert.ok(this.notification._clearTimeOut.called);
      assert.ok(this.notification._showMessage.calledWith(options));
      assert.ok(!this.notification._clearMessage.called);
    });
  });

  suite('NotificationView#hideNotification()', function() {
    setup(function() {
      sinon.stub(this.notification, '_clearMessage');
    });

    test('Should clear the Message on hideNotification', function() {
      var options = {
        message: 'test'
      };
      this.notification.persistentMessage = options;
      this.notification.hideNotification();
      assert.ok(this.notification._clearMessage.called);
      assert.ok(this.notification.persistentMessage === null);
    });
  });
});
