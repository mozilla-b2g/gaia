/* global DeviceInteraction, MockDriver, assert, exampleCmds, helper */
'use strict';
// this is hack to ensure device interactions are loaded

suite('marionette/element', function() {
  var driver, subject, client, id, device,
       Element, Client;

  helper.require('element', function(obj) {
    Element = obj;
  });

  helper.require('client', function(obj) {
    Client = obj;
  });

  id = '{fake-uuid-root}';

  function simpleCommand(method, type, response, key) {
    suite('.' + method, function() {
      device.
        issues(method).
        shouldSend({
          name: type,
          parameters: {
            id: id
          }
        }).
        serverResponds(response).
        callbackReceives(key);
    });
  }

  device = new DeviceInteraction(exampleCmds, function() {
    return subject;
  });

  setup(function() {
    driver = new MockDriver();
    client = new Client(driver);
    subject = new Element(id, client);
  });

  suite('initialization', function() {
    test('should set id', function() {
      assert.strictEqual(subject.id, id);
    });

    test('should set client', function() {
      assert.strictEqual(subject.client, client);
    });
  });

  suite('._sendCommand', function() {
    device.
      issues('_sendCommand', {name: 'test'}).
      shouldSend({name: 'test', parameters: {id: id}}).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.findElement', function() {
    device.
      issues('findElement', '#id').
      shouldSend({
        name: 'findElement',
        parameters: {
          value: '#id',
          element: id,
          using: 'css selector'
        }
      }).
      serverResponds('findElementResponse');

    test('should send callback a single element', function() {
      var value = device.commandCallback.value;
      var resultId = exampleCmds.findElementResponse().value;
      assert.instanceOf(value, Element);
      assert.strictEqual(value.id, resultId);
    });
  });

  suite('.findElements', function() {
    device.
      issues('findElements', '#id').
      shouldSend({
        name: 'findElements',
        parameters: {
          value: '#id',
          element: id,
          using: 'css selector'
        }
      }).
      serverResponds('findElementsResponse');

    test('should send callback an element instance', function() {
      var map = device.commandCallback.value.map(function(el) {
        return el.id;
      });
      assert.deepEqual(map, exampleCmds.findElementsResponse().value);
    });
  });

  suite('.scriptWith', function() {
    var calledWith,
        fn = function() {},
        cb = function() {};

    setup(function() {
      subject.client.executeScript = function() {
        calledWith = arguments;
      };
    });

    test('should call client.executeScript with ' +
      'element as argument', function() {
      subject.scriptWith(fn);

      assert.strictEqual(calledWith[0], fn);
      assert.deepEqual(calledWith[1], [
        subject
      ]);
      assert.strictEqual(calledWith[2], undefined);
    });


    test('should call client.executeScript with element ' +
      ' + callback', function(){
      subject.scriptWith(fn, cb);

      assert.strictEqual(calledWith[0], fn);
      assert.deepEqual(calledWith[1], [
        subject
      ]);
      assert.strictEqual(calledWith[2], cb);
    });

    test('should call client.executeScript with element ' +
      ' + args + callback', function(){
      subject.scriptWith(fn, ['foo', 'bar'], cb);

      assert.strictEqual(calledWith[0], fn);
      assert.deepEqual(calledWith[1], [
        subject, 'foo', 'bar'
      ]);
      assert.strictEqual(calledWith[2], cb);
    });

  });

  suite('.equals', function() {
    var equals;
    var notEquals;
    setup(function() {
      equals = new Element(id, client);
      notEquals = new Element('___I_AM_TITAN', client);
    });

    test('equals', function() {
      assert.isTrue(subject.equals(equals));
    });

    test('not equal', function() {
      assert.isFalse(subject.equals(notEquals));
    });
  });

  suite('.getAttribute', function() {
    var attr = 'name';

    device.
      issues('getAttribute', attr).
      shouldSend({
        name: 'getElementAttribute',
        parameters: {
          name: attr,
          id: id
        }
      }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.sendKeys', function() {
    suite('when given a array', function() {
      var input = ['f', 'o', 'o'];
      device.
        issues('sendKeys', input).
        shouldSend({
          name: 'sendKeysToElement',
          parameters: {
            value: input,
            id: id
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given a string', function() {
      var msg = 'foo';
      device.
        issues('sendKeys', msg).
        shouldSend({
          name: 'sendKeysToElement',
          parameters: {
            value: [msg],
            id: id
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });
  });

  suite('.cssProperty', function() {
    var property = 'margin';

    device.
      issues('cssProperty', property).
      shouldSend({
        name: 'getElementValueOfCssProperty',
        parameters: {
          propertyName: property,
          id: id
        }
      }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.tap', function() {
    suite('when given the x and y offsets', function() {
      var x = 10;
      var y = 15;

      device.
        issues('tap', x, y).
        shouldSend({
          name: 'singleTap',
          parameters: {
            x: x,
            y: y,
            id: id
          }
        }).
        serverResponds('value').
        callbackReceives('value');
    });

    suite('when given the x offset only', function() {
      var x = 10;

      device.
          issues('tap', x).
          shouldSend({
            name: 'singleTap',
            parameters: {
              x: x,
              id: id
            }
          }).
          serverResponds('value').
          callbackReceives('value');
    });

    suite('when no x and y offsets', function() {
      simpleCommand('tap', 'singleTap', 'value');
    });
  });

  simpleCommand('tagName', 'getElementTagName', 'value', 'value');
  simpleCommand('click', 'clickElement', 'ok');
  simpleCommand('text', 'getElementText', 'value', 'value');
  simpleCommand('clear', 'clearElement', 'ok');
  simpleCommand('selected', 'isElementSelected', 'value', 'value');
  simpleCommand('enabled', 'isElementEnabled', 'value', 'value');
  simpleCommand('displayed', 'isElementDisplayed', 'value', 'value');
  simpleCommand('size', 'getElementRect', 'value', 'value');
  simpleCommand('location', 'getElementRect', 'value', 'value');
  simpleCommand('rect', 'getElementRect', 'value', 'value');

});
