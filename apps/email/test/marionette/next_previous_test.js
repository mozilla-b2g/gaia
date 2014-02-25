var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');


/**
 * Checks whether or not this has a <span class="... icon-disabled ...">
 * in its DOM subtree.
 *
 * @param {Marionette.Element} button one of msgDownBtn or msgUpButton.
 * @return {boolean} whether or not the param is enabled.
 */
function isHeaderButtonEnabled(button) {
  var span = button.findElement('span');
  var className = span.getAttribute('className');
  return className.indexOf('icon-disabled') === -1;
}

marionette('email next previous', function() {
  var app;

  console.log('Creating client...');
  var client = marionette.client({
    settings: {
      // disable keyboard ftu because it blocks our display
      'keyboard.ftu.enabled': false
    }
  });

  console.log('Configuring fake server...');
  var server = serverHelper.use(null, this);

  setup(function() {
    console.log('Setup!');
    app = new Email(client);
    console.log('Launching email...');
    app.launch();
    console.log('Bringing up fake server...');
    app.manualSetupImapEmail(server);
    console.log('Sending and receiving messages...');
    app.sendAndReceiveMessages([
      { to: 'testy@localhost', subject: 'One', body: 'Fish' },
      { to: 'testy@localhost', subject: 'Two', body: 'Fish' }
    ]);
  });

  test('should grey out up when no message above', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(0);
    var el = app.msgUpBtn;
    assert.ok(!isHeaderButtonEnabled(el));
  });

  test('should grey out down when no message below', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(1);
    var el = app.msgDownBtn;
    assert.ok(!isHeaderButtonEnabled(el));
  });

  test('should not grey out up when message above', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(1);
    var el = app.msgUpBtn;
    assert.ok(isHeaderButtonEnabled(el));
  });

  test('should not grey out down when message below', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(0);
    var el = app.msgDownBtn;
    assert.ok(isHeaderButtonEnabled(el));
  });

  test('should move up when up tapped', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(1);
    console.log('Advance message reader...');
    app.advanceMessageReader(true);
    var subject = app.getMessageReaderSubject();
    assert.strictEqual(subject, 'Two');
  });

  test('should move down when down tapped', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(0);
    console.log('Advance message reader...');
    app.advanceMessageReader(false);
    var subject = app.getMessageReaderSubject();
    assert.strictEqual(subject, 'One');
  });

  test('should not move up when up tapped if greyed out', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(0);
    try {
      console.log('Advance message reader...');
      app.advanceMessageReader(true);
    } catch (err) {
      if (err.type !== 'InvalidElementState') {
        throw err;
      }
    }

    var subject = app.getMessageReaderSubject();
    assert.strictEqual(subject, 'Two');
  });

  test('should not move down when down tapped if greyed out', function() {
    console.log('Tapping message from inbox...');
    app.tapEmailAtIndex(1);
    try {
      console.log('Advance message reader...');
      app.advanceMessageReader(false);
    } catch (err) {
      if (err.type !== 'InvalidElementState') {
        throw err;
      }
    }

    var subject = app.getMessageReaderSubject();
    assert.strictEqual(subject, 'One');
  });

  suite('scroll', function() {
    setup(function() {
      console.log('Send and receive more messages...');
      // We need more messages to exercise scrolling.
      app.sendAndReceiveMessages([
        { to: 'testy@localhost', subject: 'Red', body: 'Fish' },
        { to: 'testy@localhost', subject: 'Blue', body: 'Fish' },
        { to: 'testy@localhost', subject: 'Three', body: 'Fish' },
        { to: 'testy@localhost', subject: 'Four', body: 'Fish' },
        { to: 'testy@localhost', subject: 'Even', body: 'Fish' },
        { to: 'test@localhost', subject: 'More', body: 'Fish' }
      ]);
    });

    test('should scroll up when up tapped', function() {
      // Start by scrolling to the bottom of the scroll container.
      var header = app.getHeaderAtIndex(7);
      var offsetTop = header.getAttribute('offsetTop');
      console.log('Scroll to bottom...');
      client.executeScript(function(scrollTo) {
        var scrollContainer =
          document.getElementsByClassName('msg-list-scrollouter')[0];
        scrollContainer.scrollTop = scrollTo;
      }, [offsetTop]);

      var scrollContainer = app.msgListScrollOuter;
      var initial = parseInt(scrollContainer.getAttribute('scrollTop'), 10);
      app.tapEmailAtIndex(7);

      // Advance up to the first message.
      while (true) {
        var button = app.msgUpBtn;
        if (!isHeaderButtonEnabled(button)) {
          break;
        }

        console.log('Advance message reader...');
        app.advanceMessageReader(true);
      }

      scrollContainer = app.msgListScrollOuter;
      var updated = parseInt(scrollContainer.getAttribute('scrollTop'), 10);
      assert.ok(updated < initial);
    });

    test('should scroll down when down tapped', function() {
      var scrollContainer = app.msgListScrollOuter;
      var initial = parseInt(scrollContainer.getAttribute('scrollTop'), 10);
      app.tapEmailAtIndex(0);

      // Advance down to the last message.
      while (true) {
        var button = app.msgDownBtn;
        if (!isHeaderButtonEnabled(button)) {
          break;
        }

        console.log('Advance message reader...');
        app.advanceMessageReader(false);
      }

      scrollContainer = app.msgListScrollOuter;
      var updated = parseInt(scrollContainer.getAttribute('scrollTop'), 10);
      assert.ok(updated > initial);
    });
  });
});
