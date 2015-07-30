/* global assert, helper */
'use strict';
require('../helper');

suite('error handling', function() {
  var MarionetteError;
  helper.require('error', function(obj) {
    MarionetteError = obj;
  });

  var client = marionette.client();

  test('catch error', function() {
    try {
      client.executeScript(function() {
        throw new Error('e');
      });
    } catch (e) {
      e.client.screenshot();
    }
  });

  test('throws no such element error', function() {
    try {
      client.findElement('cheese');
      assert.fail('expected no such element error to be thrown');
    } catch (e) {
      assert.include(e.toString(), 'NoSuchElement');
      assert.property(e, 'type');
      assert.equal(e.type, 'NoSuchElement');
    }
  });

  test('throws javascript error', function() {
    try {
      client.executeScript(function() { throw Error('rochefort'); });
    } catch (e) {
      assert.include(e.toString(), 'JavaScriptError');
      assert.property(e, 'type');
      assert.equal(e.type, 'JavaScriptError');
    }
  });
});
