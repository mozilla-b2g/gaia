'use strict';

require('apps/browser/test/integration/app.js');

suite(window.mozTestInfo.appPath + '>', function() {
  var device;
  var app;

  suiteTeardown(function() {
    yield app.close();
  });

  MarionetteHelper.start(function(client) {
    app = new BrowserIntegration(client);
    device = app.device;
  });

  suiteSetup(function() {
    yield IntegrationHelper.unlock(device);
    yield app.launch();
  });

  test('going to url', function() {
    var targetUrl = 'google.com';
    // attempt to go to google.com
    var inputArea = yield app.element('query');
    var go = yield app.element('go');

    yield inputArea.sendKeys([targetUrl]);
    yield go.click();

    // verify we went there
    var frame = yield device.findElement('iframe[mozbrowser]');
    var src = yield frame.getAttribute('src');

    assert.ok(src, 'has source');
    assert.include(src, targetUrl, 'has correct url')
  });
});

