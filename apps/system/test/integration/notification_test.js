require('/apps/system/test/integration/system_integration.js');

suite('notifications', function() {

  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new SystemIntegration(client);
    device = app.device;
  });

  setup(function() {
    yield app.launch();
  });

  test('text/description notification', function() {

    var title = 'uniq--integration--uniq';
    var description = 'q--desc--q';

    yield device.setContext('chrome');

    yield device.executeAsyncScript(function(text, desc) {
      window.addEventListener('mozChromeEvent', function(e) {
        var detail = e.detail;
        if (detail.type === 'desktop-notification') {
          marionetteScriptFinished(JSON.stringify(detail));
        }
      });

      var notify = window.navigator.mozNotification;
      var notification = notify.createNotification(
        text, desc
      );

      notification.show();
    }, [title, description]);

    yield device.setContext('content');
    var container = yield app.element('notificationsContainer');

    var text = yield container.getAttribute('innerHTML');
    assert.ok(text, 'container should have notifications');

    assert.include(text, title, 'should include title');
    assert.include(text, description, 'should include description');
  });
});

