var Browser = require('./lib/browser'),
    Server = require('./lib/server'),
    assert = require('assert');

marionette('search', function() {
  var client = marionette.client();
  var subject;
  var server;

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
    client.setSearchTimeout(10000);
  });

  suite('navigate to coolpage.html', function() {
    var expectedTitle = 'cool page';
    var url;

    setup(function() {
      url = server.url('coolpage.html');
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
    });

    test('loads coolpage.html', function() {
      // verify iframe is primed
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url, 'correct iframe');

      // switch to frame and verify content
      client.switchToFrame(frame);

      // verify title
      var title = client.findElement('title').getAttribute('innerHTML');
      assert.ok(
        title.indexOf(expectedTitle) !== -1,
        title + ' contains "cool page"'
      );
    });
  });

});
