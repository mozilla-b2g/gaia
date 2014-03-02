var Browser = require('./lib/browser'),
    Server = require('./lib/server'),
    assert = require('assert');
    Actions = require('marionette-client').Actions;

marionette('search', function() {
  var client = marionette.client();
  var subject;
  var server;
  var actions = new Actions(client);


  // this could be abstracted further
  suiteSetup(function(done) {
    Server.create(function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    subject = new Browser(client);
    subject.launch();

    client.helper.waitForElement('body.loaded');
  });

  suite('navigate to coolpage.html', function() {
    var frame;
    setup(function() {
      url = server.url('coolpage.html');
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
      frame = subject.currentTabFrame();
      client.switchToFrame(frame);
    });

    function longTap() {
      client.helper.waitForElement('#link');
      var link = client.findElement('#link');

      actions.longPress(link, 1.5).perform();

      subject.backToApp();
    }

    function clickOpenNewTab() {
      var openItem = client.findElement('#open-in-new-tab');
      openItem.click();
    }

    function openTab() {
      longTap();
      clickOpenNewTab();
    }

    function openNewTab() {
      frame = subject.currentTabFrame();
      client.switchToFrame(frame);

      longTap();

      clickOpenNewTab();
    }

    function assertTabsBadge(text) {
      var tabsBadge = client.findElement('#tabs-badge');
      assert.equal(tabsBadge.text(), text);
    }

    test('long press link and open context menu', function() {
      openTab();
      assertTabsBadge('2›');
    });

    test('context menu opens after a context menu', function() {
      openTab();
      openNewTab();
      assertTabsBadge('3›');
    });

    test('context menu opens after a cancel', function() {
      openTab();

      frame = subject.currentTabFrame();
      client.switchToFrame(frame);

      longTap();

      var cancelItem = client.findElement('#cancel');
      cancelItem.click();

      assertTabsBadge('2›');

      openNewTab();
      assertTabsBadge('3›');
    });
  });
});
