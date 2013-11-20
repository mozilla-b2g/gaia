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

  suite('navigate to invalid page (about:neterror)', function() {
    setup(function() {
      url = 'http://fake.url.wow/';
      subject.searchBar.sendKeys(url);
      subject.searchButton.click();
    });

    test('loads net_error.html from system', function() {
      // verify iframe is primed
      var frame = subject.currentTabFrame();
      assert.equal(frame.getAttribute('src'), url, 'correct iframe');

      // Marionette will throw an error when attempting to
      // switch to a frame that's in an error state.
      // However, we can ignore this error since we need to
      // test the about:neterror page itself.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=936301#c3
      try {
        client.switchToFrame(frame);
      } catch (e) {
        // ignore this error
      } finally {
        // now we can test the about:neterror page

        // verify we have the propery body
        var netErrorBody = frame.client.findElement('body');
        assert.equal(netErrorBody.getAttribute('id'),
          'net-error', 'Net error body is net error');

        // verify error message was set (using l10n)
        var errorMsg = frame.client.findElement('#error-message')
                       .getAttribute('innerHTML');
        assert.ok(errorMsg, 'Localization library populated error message');

        // Unfortunately, there is no easy way to test if a mozbrowser
        // window has been closed. So to test, we will attempt to fetch
        // an element from the body of our about:neterror page, and expect
        // that to throw an error since the window should be closed.
        frame.client.executeScript(function() {
          var closeBtn = document.getElementById('close-btn');
          if (!closeBtn) {
            return;
          }
          closeBtn.click();
        });
        client.switchToFrame();

        // Need to "sleep" for a few moments here since travis can be
        // slow in closing the window.
        var startTime = Date.now();
        client.waitFor(function() {
          return Date.now() - startTime > 3000;
        });
        subject.backToApp();
        frame = subject.currentTabFrame();
        try {
          netErrorBody = frame.client.findElement('body#net-error');
        } catch (e) {
          assert.ok(true, 'fetching body of closed window should throw error');
          return;
        }
        assert.ok(false, 'fetching body of closed window should throw error');
      }
    });
  });

});
