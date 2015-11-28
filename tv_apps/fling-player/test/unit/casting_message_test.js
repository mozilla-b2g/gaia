/* global castingMessage, castingMsgTemplate */
'use strict';

requireApp('fling-player/test/unit/casting_message_template.js');
requireApp('fling-player/js/master_debug.js');
requireApp('fling-player/js/casting_message.js');

suite('fling-player/castingMessage', function() {

  var validMsg;

  setup(function () {
    validMsg = castingMsgTemplate.get();
  });

  suite('Sanitize messages', function () {

    var result;

    test('should sanitize valid message', function () {
      for (var m in validMsg) {
        result = castingMessage.sanitizeMsg(validMsg[m]);
        assert.isObject(result, `sanitizing ${m} message fails`);
      }
    });

    test('should sanitize invalid message', function () {
      // TODO
    });
  });

  suite('Parse message', function () {

    var txt, result;

    test('should parse one message', function () {
      for (var m in validMsg) {
        txt = JSON.stringify(validMsg[m]);
        result = castingMessage.parse(txt);
        assert.isTrue(result instanceof Array);
        assert.equal(result.length, 1, 'should only be one message');
        assert.equal(JSON.stringify(result), `[${txt}]`);
      }
    });

    test('should parse multiple messages', function () {

      var msgs = [validMsg.play, validMsg.load];

      txt = JSON.stringify(msgs[0]) + JSON.stringify(msgs[1]);

      result = castingMessage.parse(txt);
      assert.isTrue(result instanceof Array);
      assert.equal(result.length, 2, 'should be two messages');
      assert.equal(JSON.stringify(result), JSON.stringify(msgs));
    });
  });

  suite('Stringify message', function () {

    var result;

    test('should stringify valid message', function () {
      for (var m in validMsg) {
        result = castingMessage.stringify(validMsg[m]);
        assert.equal(result, JSON.stringify(validMsg[m]));
      }
    });
  });
});
