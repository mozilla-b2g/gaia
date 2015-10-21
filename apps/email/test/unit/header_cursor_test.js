'use strict';
/* global testConfig */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

/**

 * Fake MailHeader instances for our cursor's messagesSlice.
 */
var MESSAGE_ONE = Object.freeze({ id: 'one' }),
    MESSAGE_TWO = Object.freeze({ id: 'two' }),
    MESSAGE_THREE = Object.freeze({ id: 'three' });

suite('HeaderCursor', function() {
  var evt, headerCursor, CurrentMessage;

  suiteSetup(function(done) {
    testConfig({ done: done }, [
      'evt',
      'header_cursor',
      'model_create',
    ], function(_evt, HeaderCursor, mc) {
      evt = _evt;
      headerCursor = new HeaderCursor(mc.defaultModel);
      CurrentMessage = HeaderCursor.CurrentMessage;
    });
  });

  setup(function() {
    headerCursor.messagesSlice = {
      die: function() {},
      items: [
        MESSAGE_ONE,
        MESSAGE_TWO,
        MESSAGE_THREE
      ]
    };

    headerCursor.currentMessage = new CurrentMessage(
      MESSAGE_TWO, {
        hasPrevious: true,
        hasNext: true
      }
    );
  });

  suite('#advance', function() {
    test('next should go to next', function(done) {
      headerCursor.once('currentMessage', function(currentMessage) {
        assert.deepEqual(
          currentMessage,
          new CurrentMessage(MESSAGE_THREE, {
            hasPrevious: true,
            hasNext: false
          })
        );

        done();
      });

      headerCursor.advance('next');
    });

    test('previous should go to previous', function(done) {
      headerCursor.once('currentMessage', function(currentMessage) {
        assert.deepEqual(
          currentMessage,
          new CurrentMessage(MESSAGE_ONE, {
            hasPrevious: false,
            hasNext: true
          })
        );

        done();
      });

      headerCursor.advance('previous');
    });

    test('should not die if advance out of bounds', function() {
      headerCursor.currentMessage = new CurrentMessage(
        MESSAGE_THREE, {
          hasPrevious: true,
          hasNext: false
        }
      );

      // If this doesn't error, life is good!
      headerCursor.advance('next');
    });
  });

  suite('#indexOfMessageById', function() {
    test('should be correct if contains message with id', function() {
      assert.ok(headerCursor.indexOfMessageById('two'), 2);
    });

    test('should be -1 if not contains message with id', function() {
      assert.ok(headerCursor.indexOfMessageById('purple'), -1);
    });
  });

  suite('#die', function() {
    test('should die messagesSlice', function() {
      var die = sinon.stub(headerCursor.messagesSlice, 'die');
      headerCursor.die();
      sinon.assert.called(die);
      assert.strictEqual(headerCursor.messagesSlice, null);
    });
  });
});
