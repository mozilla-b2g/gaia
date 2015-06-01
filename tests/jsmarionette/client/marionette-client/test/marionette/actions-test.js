/* global DeviceInteraction, MockDriver, exampleCmds, assert, helper */
'use strict';
suite('marionette/actions', function() {
  var driver, subject, client, device,
      Actions, Client;

  helper.require('actions', function(obj) {
    Actions = obj;
  });

  helper.require('client', function(obj) {
    Client = obj;
  });

  device = new DeviceInteraction(exampleCmds, function() {
    return subject;
  });

  setup(function() {
    driver = new MockDriver();
    client = new Client(driver);
    subject = new Actions(client);
  });

  suite('initialization', function() {
    test('should set client', function() {
      assert.strictEqual(subject.client, client);
    });
  });

  suite('.press', function() {
    var element, x, y;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      x = 0;
      y = 0;
      subject.press(element, x, y);
    });

    test('should have a press action in the chain', function() {
      var pressAction = [['press', element.id, x, y]];
      assert.deepEqual(subject.actionChain, pressAction);
    });
  });

  suite('.release', function() {
    setup(function() {
      subject.release();
    });

    test('should have a release action in the chain', function() {
      var releaseAction = [['release']];
      assert.deepEqual(subject.actionChain, releaseAction);
    });
  });

  suite('.move', function() {
    var element;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      subject.move(element);
    });

    test('should have a move action in the chain', function() {
      var moveAction = [['move', element.id]];
      assert.deepEqual(subject.actionChain, moveAction);
    });
  });

  suite('.moveByOffset', function() {
    var x, y;

    setup(function() {
      x = 1;
      y = 1;
      subject.moveByOffset(x, y);
    });

    test('should have a move by offset action in the chain', function() {
      var moveByOffsetAction = [['moveByOffset', x, y]];
      assert.deepEqual(subject.actionChain, moveByOffsetAction);
    });
  });

  suite('.wait', function() {
    var time;

    setup(function() {
      time = 1;
      subject.wait(time);
    });

    test('should have a wait action in the chain', function() {
      var waitAction = [['wait', time]];
      assert.deepEqual(subject.actionChain, waitAction);
    });
  });

  suite('.cancel', function() {
    setup(function() {
      subject.cancel();
    });

    test('should have a cancel action in the chain', function() {
      var cancelAction = [['cancel']];
      assert.deepEqual(subject.actionChain, cancelAction);
    });
  });

  suite('.tap', function() {
    var element, x, y;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      x = 0;
      y = 0;
      subject.tap(element, x, y);
    });

    test('should have a tap action in the chain', function() {
      var tapAction = [
        ['press', element.id, x, y],
        ['release']
      ];

      assert.deepEqual(subject.actionChain, tapAction);
    });
  });

  suite('.doubleTap', function() {
    var element, x, y;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      x = 0;
      y = 0;
      subject.doubleTap(element, x, y);
    });

    test('should have a double tap action in the chain', function() {
      var doubleTapAction = [
        ['press', element.id, x, y],
        ['release'],
        ['press', element.id, x, y],
        ['release']
      ];

      assert.deepEqual(subject.actionChain, doubleTapAction);
    });
  });

  suite('.flick', function() {
    var element, x1, y1, x2, y2;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      x1 = 0;
      y1 = 0;
      x2 = 100;
      y2 = 100;
    });

    function shouldHaveFlickAction() {
      var firstAction = ['press', element.id, x1, y1];
      var lastAction = ['release'];
      var lastActionIndex = subject.actionChain.length - 1;

      assert.deepEqual(subject.actionChain[0], firstAction);
      for (var i = 1; i < lastActionIndex; i += 2) {
        assert.strictEqual(subject.actionChain[i][0], 'moveByOffset');
        assert.strictEqual(subject.actionChain[i + 1][0], 'wait');
      }
      assert.deepEqual(subject.actionChain[lastActionIndex], lastAction);
    }

    test('should have a flick action in the chain', function() {
      subject.flick(element, x1, y1, x2, y2);
      shouldHaveFlickAction();
    });

    test('should have a flick action in the chain ' +
       'when the duration param is 300', function() {
      var duration = 300;
      subject.flick(element, x1, y1, x2, y2, duration);
      shouldHaveFlickAction();
    });
  });


  suite('.longPress', function() {
    var element, time;

    setup(function() {
      element = { id: '{fake-uuid-root}' };
      time = 1;
      subject.longPress(element, time);
    });

    test('should have a long press action in the chain', function() {
      var longPressAction = [
        ['press', element.id],
        ['wait', time],
        ['release']
      ];

      assert.deepEqual(subject.actionChain, longPressAction);
    });
  });

  suite('.perform', function() {
    device.
      issues('perform').
      shouldSend({
        name: 'actionChain',
        parameters: {
          chain: [],
          nextId: null
        }
      }).
      serverResponds('value').
      callbackReceives('value');
  });
});
