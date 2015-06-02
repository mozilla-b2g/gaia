suite('json wire protocol', function() {
  var assert = require('assert');
  var jsonWireProtocol = require('../');

  var subject;
  var TWO_BYTE = 'ž';
  var HAS_BUFFER = typeof Buffer !== 'undefined';

  function createBytes(content) {
      return new Buffer(content);
  }

  test('.separator', function() {
    assert.ok(jsonWireProtocol.separator);
  });

  suite('#stringify', function() {
    test('ASCII only', function() {
      var input = { a: 'abcdefg' };
      var expected = JSON.stringify(input);

      expected = expected.length + ':' + expected;
      var output = jsonWireProtocol.stringify(input);

      assert.deepEqual(expected, output);
    });

    test('invalid strings', function() {
      var invalid = 'xfoobar!';

      assert.throws(function() {
        jsonWireProtocol.parse(invalid);
      });
    });

    test('with multibyte chars', function() {
      var input = { a: TWO_BYTE + TWO_BYTE + TWO_BYTE };
      var expected = JSON.stringify(input);

      expected = '14:' + expected;
      assert.deepEqual(jsonWireProtocol.stringify(input), expected);
    });
  });

  suite('#parse', function() {
    test('working string', function() {
      var input = { woot: TWO_BYTE };
      var string = jsonWireProtocol.stringify(input);
      assert.deepEqual(
        input,
        jsonWireProtocol.parse(createBytes(string))
      );
    });
  });

  suite('.Stream', function() {
    setup(function() {
      subject = new jsonWireProtocol.Stream();
    });

    suite('#write', function() {

      suite('multiple commands over two buffers', function() {
        var commandA = { a: 'cool' };
        var commandB = { b: 'woot' };
        var commandC = { c: 'wtfman' };
        var commandD = { d: TWO_BYTE };

        var all = [commandA, commandB, commandC].map(jsonWireProtocol.stringify).join('');
        var half = all.length / 2;

        var bufferA = createBytes(all.slice(0, half));
        var bufferB = createBytes(all.slice(half) + jsonWireProtocol.stringify(commandD));

        var parsed;

        setup(function() {
          parsed = [];

          subject.on('data', function(result) {
            parsed.push(result);
          });

          subject.write(bufferA);
          subject.write(bufferB);
        });

        test('result after writing to stream', function() {
          assert.deepEqual(
            parsed,
            [commandA, commandB, commandC, commandD]
          );
        });
      });

      test('multiple chunks until length', function(done) {
        var expected = { longer: TWO_BYTE + 'a' + TWO_BYTE };
        var string = jsonWireProtocol.stringify(expected);

        subject.on('data', function(result) {
          assert.deepEqual(result, expected);
          done();
        });

        for (var i = 0; i < string.length; i++) {
          subject.write(createBytes(string[i]));
        }
      });

      suite('entire buffer', function() {
        var buffer;
        /* 13 ascii bytes */
        var string = '{"one":"foo"}';
        var raw;

        setup(function() {
          buffer = createBytes('13:' + string);
        });

        test('read entire buffer', function(done) {
          var expected = { one: 'foo' };
          subject.once('data', function(data) {
            assert.deepEqual(data, expected);
            done();
          });

          subject.write(buffer);
        });
      });
    });
  });

});
