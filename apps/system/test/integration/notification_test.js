requireCommon('/test/marionette.js');

suite('notifications', function() {

  var device;

  testSupport.startMarionette(function(driver) {
    device = driver;
  });

  setup(function() {
    this.timeout(10000);
    yield device.setScriptTimeout(5000);
    yield device.goUrl('app://system.gaiamobile.org');
  });

  test('text/description notification', function() {

    var title = 'uniq--integration--uniq';
    var description = 'q--desc--q';

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

    var container = yield device.findElement(
      '#notifications-container'
    );

    var text = yield container.getAttribute('innerHTML');
    assert.ok(text, 'container should have notifications');

    assert.include(text, title, 'should include title');
    assert.include(text, description, 'should include description');
  });
});

