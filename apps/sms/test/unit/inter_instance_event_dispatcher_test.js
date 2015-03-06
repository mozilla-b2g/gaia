/*global InterInstanceEventDispatcher,
         MockBroadcastChannel,
         BroadcastChannel
*/

'use strict';

require('/shared/js/event_dispatcher.js');

require('/js/inter_instance_event_dispatcher.js');
require('/test/unit/mock_broadcast_channel.js');

suite('InterInstanceEventDispatcher >', function() {
  var realBroadcastChannel;

  suiteSetup(function() {
    realBroadcastChannel = Object.getOwnPropertyDescriptor(
      window, 'BroadcastChannel'
    );
    window.BroadcastChannel = MockBroadcastChannel;
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'BroadcastChannel', realBroadcastChannel);
  });

  setup(function() {
    this.sinon.spy(window, 'BroadcastChannel');
    this.sinon.stub(BroadcastChannel.prototype, 'addEventListener');
    this.sinon.stub(BroadcastChannel.prototype, 'removeEventListener');
    this.sinon.stub(BroadcastChannel.prototype, 'close');
    this.sinon.stub(BroadcastChannel.prototype, 'postMessage');
    this.sinon.spy(window, 'addEventListener');

    this.sinon.stub(window.Date, 'now').returns(1234);
    this.sinon.stub(window.Math, 'random').returns(5678);

    InterInstanceEventDispatcher.connect();
  });

  teardown(function() {
    InterInstanceEventDispatcher.disconnect();
  });

  test('correctly connects to BroadcastChannel', function() {
    sinon.assert.calledWith(BroadcastChannel, 'messages-channel');
    sinon.assert.calledWith(
      BroadcastChannel.prototype.addEventListener,
      'message'
    );

    InterInstanceEventDispatcher.connect();
    sinon.assert.calledOnce(BroadcastChannel);
    sinon.assert.calledWith(
      BroadcastChannel.prototype.postMessage,
      { instanceId: '1234:5678', name: 'activated' }
    );

    InterInstanceEventDispatcher.disconnect();
    InterInstanceEventDispatcher.connect();
    sinon.assert.calledTwice(BroadcastChannel);
  });

  test('correctly disconnects from BroadcastChannel', function() {
    var addEventListenerArgs =
      BroadcastChannel.prototype.addEventListener.lastCall.args;
    window.addEventListener.withArgs('unload').yield();

    sinon.assert.calledWith(
      BroadcastChannel.prototype.postMessage,
      { instanceId: '1234:5678', name: 'deactivated' }
    );

    sinon.assert.calledWith(BroadcastChannel.prototype.removeEventListener,
      addEventListenerArgs[0],
      // Reference to "onmessage" listener function
      addEventListenerArgs[1]
    );

    sinon.assert.callOrder(
      BroadcastChannel.prototype.postMessage,
      BroadcastChannel.prototype.close
    );
  });

  test('correctly handles incoming BroadcastChannel messages', function() {
    BroadcastChannel.prototype.postMessage.reset();

    var onDraftsChangedStub = sinon.stub();
    InterInstanceEventDispatcher.on('drafts-changed', onDraftsChangedStub);

    BroadcastChannel.prototype.addEventListener.withArgs('message').yield({
      data: {
        instanceId: '0000:0000',
        name: 'drafts-changed',
        parameters: { key: 'value' }
      }
    });

    sinon.assert.calledWith(onDraftsChangedStub, { key: 'value' });
    sinon.assert.notCalled(BroadcastChannel.prototype.postMessage);

    BroadcastChannel.prototype.addEventListener.withArgs('message').yield({
      data: {
        instanceId: '0000:0000',
        name: 'drafts-changed',
        parameters: { key: 'value#2' }
      }
    });

    sinon.assert.calledTwice(onDraftsChangedStub);
    sinon.assert.calledWith(onDraftsChangedStub, { key: 'value#2' });

    sinon.assert.notCalled(BroadcastChannel.prototype.postMessage);

    // correctly handles "activated" messages
    BroadcastChannel.prototype.addEventListener.withArgs('message').yield({
      data: {
        instanceId: '0000:0000',
        name: 'activated'
      }
    });
    sinon.assert.calledTwice(onDraftsChangedStub);
    sinon.assert.calledWith(
      BroadcastChannel.prototype.postMessage,
      { instanceId: '1234:5678', name: 'alive' }
    );
  });

  test('correctly handles outgoing BroadcastChannel messages', function() {
    var onDraftsChangedStub = sinon.stub();
    InterInstanceEventDispatcher.on('drafts-changed', onDraftsChangedStub);

    assert.throws(() => {
      InterInstanceEventDispatcher.emit('something-changed');
    }, 'Event "something-changed" is not allowed!');

    InterInstanceEventDispatcher.disconnect();
    assert.throws(() => {
      InterInstanceEventDispatcher.emit('drafts-changed', { key: 'value' });
    }, 'Channel is not created!');
    InterInstanceEventDispatcher.connect();

    InterInstanceEventDispatcher.emit('drafts-changed', { key: 'value' });
    sinon.assert.calledWith(BroadcastChannel.prototype.postMessage, {
      instanceId: '1234:5678',
      name: 'drafts-changed',
      parameters: { key: 'value' }
    });
    sinon.assert.notCalled(onDraftsChangedStub, 'Does not broadcast to itself');
  });
});
