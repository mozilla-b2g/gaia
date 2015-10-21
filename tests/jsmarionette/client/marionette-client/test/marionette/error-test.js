/* global assert, helper */
'use strict';
suite('marionette/error', function() {

  var MarionetteError;

  helper.require('error', function(obj) {
    MarionetteError = obj;
  });

  test('should expose .ERRORS', function() {
    assert.property(MarionetteError, 'ERRORS');
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

    test('should recognise known error code', function() {
      var err = new MarionetteError({}, {error: 'no such element'});
      assert.property(err, 'type');
      assert.equal(err.type, 'NoSuchElement');
    });

    test('should fall back to GenericError for unknown error code', function() {
      var err = new MarionetteError({}, {error: 'brunost'});
      assert.property(err, 'type');
      assert.equal(err.type, 'GenericError');
    });

    test('should support all errors', function() {
      for (var s in MarionetteError.ERRORS) {
        var err = new MarionetteError({}, {error: s});
        assert.strictEqual(err.type, MarionetteError.ERRORS[s]);
        assert.include(err.message, MarionetteError.ERRORS[s]);
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
        MarionetteError.ERRORS['webdriver error']
      );
    });

    test('should use GenericError error when unknown error code', function() {
      var result = new MarionetteError({}, {error: 'cheese'});
      assert.strictEqual(
        result.name,
        MarionetteError.ERRORS['webdriver error']
      );
    });
  });

});
