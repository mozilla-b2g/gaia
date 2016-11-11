/**
 * Tests for the shared Pub/Sub API code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/event_emitter.js');

suite('Event emitter', function() {

  var sub, pub, un_sub;

  test('subscribe', function() {
    sub = EventEmitter.on('testEvent', function(evt, arg) {
      assert.equal(evt, 'testEvent');
      assert.equal(arg, 'testArgument');
    });
  });

  test('publish', function() {
    pub = EventEmitter.trigger('testEvent', 'testArgument');
    assert.equal(pub, true);
  });

  test('unsubscribe', function() {
    un_sub = EventEmitter.off(sub);
    assert.equal(un_sub, 0);
  });

});
