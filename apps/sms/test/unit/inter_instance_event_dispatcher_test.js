/*global InterInstanceEventDispatcher,
         MockSharedWorker,
         SharedWorker
*/

'use strict';

require('/js/event_dispatcher.js');
require('/js/iac/event_dispatcher.js');
require('/test/unit/mock_shared_worker.js');

suite('InterInstanceEventDispatcher >', function() {
  var realSharedWorker;

  suiteSetup(function() {
    realSharedWorker = Object.getOwnPropertyDescriptor(window, 'SharedWorker');
    window.SharedWorker = MockSharedWorker;
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'SharedWorker', realSharedWorker);
  });

  setup(function() {
    this.sinon.spy(window, 'SharedWorker');
    this.sinon.stub(SharedWorker.prototype.port, 'addEventListener');
    this.sinon.stub(SharedWorker.prototype.port, 'removeEventListener');
    this.sinon.stub(SharedWorker.prototype.port, 'start');
    this.sinon.stub(SharedWorker.prototype.port, 'close');
    this.sinon.stub(SharedWorker.prototype.port, 'postMessage');
    this.sinon.spy(window, 'addEventListener');

    InterInstanceEventDispatcher.connect();
  });

  teardown(function() {
    InterInstanceEventDispatcher.disconnect();
  });

  test('correctly connects to SharedWorker', function() {
    sinon.assert.calledWith(SharedWorker, 'js/iac/shared_worker.js');
    sinon.assert.calledWith(
      SharedWorker.prototype.port.addEventListener,
      'message'
    );
    sinon.assert.called(SharedWorker.prototype.port.start);

    // Doesn't create new SharedWorker on subsequent connects
    InterInstanceEventDispatcher.connect();
    sinon.assert.calledOnce(SharedWorker);

    InterInstanceEventDispatcher.disconnect();
    InterInstanceEventDispatcher.connect();
    sinon.assert.calledTwice(SharedWorker);
  });

  test('correctly disconnects from SharedWorker', function() {
    window.addEventListener.withArgs('unload').yield();

    sinon.assert.calledWith(
      SharedWorker.prototype.port.postMessage,
      { name: 'closed' }
    );
    sinon.assert.callOrder(
      SharedWorker.prototype.port.postMessage,
      SharedWorker.prototype.port.close
    );
  });

  test('correctly handles incoming SharedWorker messages', function() {
    var onDraftsChangedStub = sinon.stub();
    InterInstanceEventDispatcher.on('drafts-changed', onDraftsChangedStub);

    SharedWorker.prototype.port.addEventListener.withArgs('message').yield({
      data: {
        name: 'drafts-changed',
        parameters: { key: 'value' }
      }
    });

    sinon.assert.calledWith(onDraftsChangedStub, { key: 'value' });
    sinon.assert.notCalled(SharedWorker.prototype.port.postMessage);

    SharedWorker.prototype.port.addEventListener.withArgs('message').yield({
      data: {
        name: 'drafts-changed',
        parameters: { key: 'value#2' }
      }
    });

    sinon.assert.calledTwice(onDraftsChangedStub);
    sinon.assert.calledWith(onDraftsChangedStub, { key: 'value#2' });
    sinon.assert.notCalled(SharedWorker.prototype.port.postMessage);

    // correctly handles ping messages
    SharedWorker.prototype.port.addEventListener.withArgs('message').yield({
      data: { name: 'ping' }
    });
    sinon.assert.calledTwice(onDraftsChangedStub);
    sinon.assert.calledWith(
      SharedWorker.prototype.port.postMessage,
      { name: 'pong' }
    );
  });

  test('correctly handles outgoing SharedWorker messages', function() {
    var onDraftsChangedStub = sinon.stub();
    InterInstanceEventDispatcher.on('drafts-changed', onDraftsChangedStub);

    assert.throws(() => {
      InterInstanceEventDispatcher.emit('something-changed');
    }, 'Event "something-changed" is not allowed!');

    InterInstanceEventDispatcher.disconnect();
    assert.throws(() => {
      InterInstanceEventDispatcher.emit('drafts-changed', { key: 'value' });
    }, 'Worker is not connected!');
    InterInstanceEventDispatcher.connect();

    InterInstanceEventDispatcher.emit('drafts-changed', { key: 'value' });
    sinon.assert.calledWith(SharedWorker.prototype.port.postMessage, {
      name: 'drafts-changed',
      parameters: { key: 'value' }
    });
    sinon.assert.notCalled(onDraftsChangedStub, 'Does not broadcast to itself');
  });
});
