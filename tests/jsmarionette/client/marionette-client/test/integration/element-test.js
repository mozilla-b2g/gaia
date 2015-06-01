/* global assert */
'use strict';
var querystring = require('querystring');

require('../helper');

suite('element methods', function() {
  var client = marionette.client();

  setup(function() {
    client.goUrl('data:text/html,' + querystring.escape(
        '<div id="el" style="width: 50px; height: 50px">cheese</div>'));
  });

  test('#displayed', function() {
    var element = client.findElement('html');
    assert.strictEqual(element.displayed(), true);
  });

  test('#scriptWith', function() {
    var element = client.findElement('html');
    var evaled = element.scriptWith(function(el, arg) {
      return el.tagName + ' ' + arg;
    }, ['FTW!']);

    assert.equal(evaled, 'HTML FTW!');
  });

  test('#findElement', function() {
    var el = client.findElement('html');
    assert.instanceOf(el, client.Element);
  });

  test('#findElements', function() {
    var els = client.findElements('html');
    assert.isArray(els);
    els.forEach(function(el) { assert.instanceOf(el, client.Element); });
  });

  test('#findElement - missing', function() {
    var err;
    try {
      client.findElement('#fooobaramazingmissing');
    } catch (e) {
      err = e;
    }

    if (!err) throw new Error('missing element did not trigger an error');
    assert.equal(err.type, 'NoSuchElement');
  });

  test('#cssProperty', function() {
    var body = client.findElement('body');
    var font = body.cssProperty('font-size');
    assert.ok(font, 'returns a css property value');
  });

  test('#size', function () {
    var element = client.findElement('#el');
    var size = element.size();
    assert.property(size, 'width');
    assert.property(size, 'height');
    assert.equal(size.width, 50);
    assert.equal(size.height, 50);
  });

  test('#location', function () {
    var element = client.findElement('#el');
    var location = element.location();
    assert.property(location, 'x');
    assert.property(location, 'y');
  });

  test('#rect', function () {
    var element = client.findElement('#el');
    var rect = element.rect();
    assert.property(rect, 'x');
    assert.property(rect, 'y');
    assert.property(rect, 'width');
    assert.property(rect, 'height');
    assert.equal(rect.width, 50);
    assert.equal(rect.height, 50);
  });
});
