/* global castingMessage */
'use strict';

requireApp('fling-player/js/casting_message.js');

suite('fling-player/castingMessage', function() {

  var validMsg;

  setup(function () {
    validMsg = {
      ack : {
        type : 'ack',
        seq : 1
      },
      statusBuffering : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'buffering'
      },
      statusLoaded : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'loaded'
      },
      statusBuffered : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'buffered'
      },
      statusPlaying : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'playing'
      },
      statusSeeked : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'seeked'
      },
      statusStopped : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'stopped'
      },
      statusError : {
        type : 'status',
        seq : 1,
        time : 168,
        status : 'error',
        error : '404'
      },
      load : {
        type : 'load',
        seq : 1,
        url : 'http://foo.com/bar.ogg'
      },
      play : {
        type : 'play',
        seq : 1
      },
      pause : {
        type : 'pause',
        seq : 1
      },
      seek : {
        type : 'seek',
        seq : 1,
        time : 168
      }
    };
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
