/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ParsedMessage */

'use strict';

requireApp('wappush/js/provisioning.js');
requireApp('wappush/js/parsed_message.js');

suite('ParsedMessage', function() {
  var messages;
  var timestamp;

  suiteSetup(function() {
    timestamp = Date.now();
    messages = {
      si_text_only: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication>check this out</indication></si>',
        serviceId: 0
      },

      si_href_only: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication href="http://www.mozilla.org"></indication>' +
                 '</si>',
        serviceId: 0
      },

      si_text_and_href: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication href="http://www.mozilla.org">' +
                 'check this out</indication></si>',
        serviceId: 0
      },

      si_id: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            href="http://www.mozilla.org">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },

      created: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            href="http://www.mozilla.org"' +
                 '            created="2013-09-03T10:35:33Z">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },

      expires: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            href="http://www.mozilla.org"' +
                 '            si-expires="2013-09-03T10:35:33Z">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },

      action: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication action="signal-none">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },

      invalid_delete: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication action="delete"' +
                 '            href="http://www.mozilla.org">' +
                 'check this out' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },

      sl: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.sl',
        content: '<sl href="http://www.mozilla.org"/>',
        serviceId: 0
      },

      sl_action: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.sl',
        content: '<sl href="http://www.mozilla.org" action="execute-high"/>',
        serviceId: 0
      },

      cp_noauth: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        serviceId: 0
      },

      cp_netwpin_checked_notpass: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
          sec: 'NETWPIN',
          checked: true,
          pass: false
        },
        serviceId: 0
      },

      unsupported: {
        sender: '+31641600986',
        contentType: 'text/foobar',
        content: '',
        serviceId: 0
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
      assert.equal(message.action, 'signal-medium');
      assert.equal(message.serviceId, 0);
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

    test('SI message with explicit expiration date', function() {
      var message = ParsedMessage.from(messages.expires, timestamp);

      assert.equal(message.expires, Date.parse('2013-09-03T10:35:33Z'));
      assert.isTrue(message.isExpired());
    });

    test('SI message with explicit action', function() {
      var message = ParsedMessage.from(messages.action, timestamp);

      assert.equal(message.action, 'signal-none');
    });

    test('SI message with delete action but no si-id field', function() {
      assert.isNull(ParsedMessage.from(messages.invalid_delete, timestamp));
    });

    test('SL message', function() {
      var message = ParsedMessage.from(messages.sl, timestamp);

      assert.equal(message.type, 'text/vnd.wap.sl');
      assert.equal(message.text, undefined);
      assert.equal(message.href, 'http://www.mozilla.org');
      assert.equal(message.action, 'execute-low');
    });

    test('SL message with explicit action', function() {
      var message = ParsedMessage.from(messages.sl_action, timestamp);

      assert.equal(message.action, 'execute-high');
    });

    test('OMA CP message without auth info', function() {
      var message = ParsedMessage.from(messages.cp_noauth, timestamp);

      assert.equal(message, null);
    });

    test('OMA CP message with NETWPIN auth info not authenticated', function() {
      var message = ParsedMessage.from(messages.cp_netwpin_checked_notpass,
                                       timestamp);

      assert.equal(message, null);
    });

    test('unsupported content', function() {
      var message = ParsedMessage.from(messages.unsupported, timestamp);

      assert.equal(message, null);
    });
  });
});
