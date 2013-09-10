var Browser = require('./lib/browser'),
    assert = require('assert');

marionette('tabs-screen', function() {
  var client = marionette.client();
  var subject;

  setup(function() {
    subject = new Browser(client);
    subject.launch();

    client.helper.waitForElement('body.loaded');
    client.setSearchTimeout(10000);
  });

  suite('Open tabs-screen', function() {

    setup(function() {
      subject.tabsBadge.click();
    });

    test('tabs-screen is open', function() {
      assert.ok(client.helper.waitForElement('#tabs-list'), 'tabs-screen open');
    });
  });

});

