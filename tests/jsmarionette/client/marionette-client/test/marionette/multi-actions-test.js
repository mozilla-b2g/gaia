/* global DeviceInteraction, MockDriver, assert, exampleCmds, helper */
'use strict';
suite('marionette/multi-actions', function() {
  var driver, subject, actions, client, device,
      MultiActions, Actions, Client;

  helper.require('multi-actions', function(obj) {
    MultiActions = obj;
  });

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
    actions = new Actions(client);
    subject = new MultiActions(client);
  });

  suite('initialization', function() {
    test('should set client', function() {
      assert.strictEqual(subject.client, client);
    });
  });

  suite('.add', function() {
    setup(function() {
      subject.add(actions);
    });

    test('should have a action chain', function() {
      assert.deepEqual(subject.multiActions[0], actions.actionChain);
    });
  });

  suite('.perform', function() {
    device.
      issues('perform').
      shouldSend({
        type: 'multiAction',
        value: [],
        max_length: 0
      }).
      serverResponds('ok').
      callbackReceives();
  });
});
