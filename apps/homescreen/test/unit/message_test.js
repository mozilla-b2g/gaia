'use strict';

requireApp('homescreen/js/message.js');

suite('message.js >', function() {

  var message;

  suiteSetup(function() {
    message = new Message(0, 'Hello');
  });

  suiteTeardown(function() {
    message = null;
  });

  test('The type attribute has been initialized correctly >', function() {
    assert.equal(message.type, 0);
  });

  test('The data attribute has been initialized correctly >', function() {
    assert.equal(message.data, 'Hello');
  });

  test('The type of the message should be ADD_BOOKMARK >', function() {
    assert.equal(message.type, Message.Type.ADD_BOOKMARK);
  });

});
