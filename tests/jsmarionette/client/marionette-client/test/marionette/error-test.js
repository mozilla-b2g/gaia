/* global assert, helper */
'use strict';
suite('marionette/error', function() {

  var MarionetteError;

  helper.require('error', function(obj) {
    MarionetteError = obj;
  });

  test('should expose .CODES', function() {
    assert.operator(Object.keys(MarionetteError.CODES).length, '>', 0);
  });

  test('should expose .STATUSES', function() {
    assert.operator(Object.keys(MarionetteError.STATUSES).length, '>', 0);
  });

  suite('#error', function() {
    test('should populate message', function() {
      var err = new MarionetteError({}, {message: 'msg'});
      assert.property(err, 'message');
      assert.include(err.message, 'msg');
    });

    test('should populate stacktrace', function() {
      var trace = 'brie';
      var err = new MarionetteError({}, {stacktrace: trace});
      assert.property(err, 'stack');
      assert.include(err.message, trace);
      assert.include(err.stack, trace);
    });

    test('should populate type', function() {
      var err = new MarionetteError({}, {});
      assert.property(err, 'type');
    });

    test('should recognise known number', function() {
      var err = new MarionetteError({}, {status: 7});
      assert.property(err, 'type');
      assert.equal(err.type, 'NoSuchElement');
    });

    test('should recognise known string', function() {
      var err = new MarionetteError({}, {status: 'no such element'});
      assert.property(err, 'type');
      assert.equal(err.type, 'NoSuchElement');
    });

    test('should fall back to GenericError for unknown number', function() {
      var err = new MarionetteError({}, {status: 666});
      assert.property(err, 'type');
      assert.equal(err.type, 'GenericError');
    });

    test('should fall back to GenericError for unknown string', function() {
      var err = new MarionetteError({}, {status: 'brunost'});
      assert.property(err, 'type');
      assert.equal(err.type, 'GenericError');
    });

    test('should support all error number codes', function() {
      for (var n in MarionetteError.CODES) {
        var err = new MarionetteError({}, {status: n});
        assert.strictEqual(err.type, MarionetteError.CODES[n]);
        assert.include(err.message, MarionetteError.CODES[n]);
        assert.instanceOf(err, Error);
      }
    });

    test('should support all error status strings', function() {
      for (var s in MarionetteError.STATUSES) {
        var err = new MarionetteError({}, {status: s});
        assert.strictEqual(err.type, MarionetteError.STATUSES[s]);
        assert.include(err.message, MarionetteError.STATUSES[s]);
        assert.instanceOf(err, Error);
      }
    });

    test('should contain client', function() {
      var client = {};
      var result = new MarionetteError(client, {
        status: 7777,
        message: 'foo',
        stack: 'bar'
      });

      assert.equal(result.client, client);
      assert.strictEqual(
        result.name,
        MarionetteError.STATUSES['webdriver error']
      );
    });

    test('should use GenericError when unknown error code', function() {
      var result = new MarionetteError({}, {status: 7777});
      assert.strictEqual(
        result.name,
        MarionetteError.STATUSES['webdriver error']
      );
    });

    test('should use GenericError error when unknown error status', function() {
      var result = new MarionetteError({}, {status: 'cheese'});
      assert.strictEqual(
        result.name,
        MarionetteError.STATUSES['webdriver error']
      );
    });
  });

});
