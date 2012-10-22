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

    yield IntegrationHelper.sendAtom(
      device,
      '/apps/system/test/integration/atoms/notification',
      true,
      [title, description]
    );

    yield device.setContext('content');
    var container = yield app.element('notificationsContainer');

    var text = yield container.getAttribute('innerHTML');
    assert.ok(text, 'container should have notifications');

    assert.include(text, title, 'should include title');
    assert.include(text, description, 'should include description');
  });
});

