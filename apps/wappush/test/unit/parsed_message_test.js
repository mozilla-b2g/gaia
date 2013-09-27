'use strict';

requireApp('wappush/test/unit/mock_messagedb.js');
requireApp('wappush/js/parsed_message.js');

var mocksHelperParsedMessage = new MocksHelper([
  'MessageDB'
]).init();

suite('ParsedMessage', function() {
  var messages;
  var timestamp;

  mocksHelperParsedMessage.attachTestHelpers();

  suiteSetup(function() {
    timestamp = Date.now();
    messages = {
      si_text_only: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication>check this out</indication></si>'
      },

      si_href_only: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication href="http://www.mozilla.org"></indication>' +
                 '</si>'
      },

      si_text_and_href: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication href="http://www.mozilla.org">' +
                 'check this out</indication></si>'
      },

      si_id: {
        sender: '+31641600986',
        timestamp: timestamp,
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            href="http://www.mozilla.org">' +
                 'check this out' +
                 '</indication>' +
                 '</si>'
      },

      created: {
        sender: '+31641600986',
        timestamp: timestamp,
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            href="http://www.mozilla.org"' +
                 '            created="2013-09-03T10:35:33Z">' +
                 'check this out' +
                 '</indication>' +
                 '</si>'
      },

      sl: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.sl',
        content: '<sl href="http://www.mozilla.org"/>'
      },

      unsupported: {
        sender: '+31641600986',
        contentType: 'text/foobar',
        content: ''
      }
    };
  });

  suite('ParsedMessage.from()', function() {
    test('Text only', function() {
      var message = ParsedMessage.from(messages.si_text_only, timestamp);

      assert.equal(message.type, 'text/vnd.wap.si');
      assert.equal(message.sender, '+31641600986');
      assert.equal(message.timestamp, timestamp);
      assert.equal(message.text, 'check this out');
      assert.equal(message.href, undefined);
    });

    test('HREF only', function() {
      var message = ParsedMessage.from(messages.si_href_only, timestamp);

      assert.equal(message.text, '');
      assert.equal(message.href, 'http://www.mozilla.org');
      assert.equal(message.id, 'http://www.mozilla.org');
    });

    test('Text and HREF only', function() {
      var message = ParsedMessage.from(messages.si_text_and_href, timestamp);

      assert.equal(message.text, 'check this out');
      assert.equal(message.href, 'http://www.mozilla.org');
      assert.equal(message.id, 'http://www.mozilla.org');
    });

    test('SI message with explicit si-id field', function() {
      var message = ParsedMessage.from(messages.si_id, timestamp);

      assert.equal(message.href, 'http://www.mozilla.org');
      assert.equal(message.id, 'gaia-test@mozilla.org');
    });

    test('SI message with explicit creation time', function() {
      var message = ParsedMessage.from(messages.created, timestamp);

      assert.equal(message.created, Date.parse('2013-09-03T10:35:33Z'));
    });

    test('SL', function() {
      var message = ParsedMessage.from(messages.sl, timestamp);

      assert.equal(message.type, 'text/vnd.wap.sl');
      assert.equal(message.text, undefined);
      assert.equal(message.href, 'http://www.mozilla.org');
    });

    test('unsupported content', function() {
      var message = ParsedMessage.from(messages.unsupported, timestamp);

      assert.equal(message, null);
    });
  });
});
