/*global bridge,
         ConversationClient,
         MocksHelper,
         streamClient,
         Thread
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/test/unit/mock_shared_worker.js');
require('/services/test/unit/mock_threads.js');
require('/services/js/conversation/conversation_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'SharedWorker',
  'streamClient',
  'Thread'
]).init();

suite('ConversationClient >', function() {
  const APP_ID = 'fake-app-id';

  var clientStub;

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    clientStub = sinon.stub({
      stream: () => {},
      plugin: () => {}
    });

    clientStub.plugin.returns(clientStub);

    this.sinon.spy(window, 'SharedWorker');

    this.sinon.stub(bridge, 'client').returns(clientStub);
  });

  test('throws if app instance id is not provided', function() {
    assert.throws(() => ConversationClient.init());
  });

  test('bridge client is correctly initialized', function() {
    ConversationClient.init(APP_ID);

    sinon.assert.calledWith(
      SharedWorker,
      '/services/js/conversation/conversation_service.js'
    );

    sinon.assert.calledOnce(bridge.client);
    sinon.assert.calledWith(bridge.client, {
      service: 'conversation-service',
      endpoint: SharedWorker.lastCall.returnValue,
      timeout: false
    });
    sinon.assert.calledWith(clientStub.plugin, streamClient);
  });

  suite('getAllConversations', function() {
    var streamStub, resolveStream, rejectStream;
    setup(function() {
      ConversationClient.init(APP_ID);

      streamStub = sinon.stub({
        listen: () => {},
        closed: new Promise((resolve, reject) => {
          resolveStream = resolve;
          rejectStream = reject;
        })
      });

      clientStub.stream.withArgs('getAllConversations', APP_ID).returns(
        streamStub
      );
    });

    test('calls callback on every retrieved item', function() {
      var onConversationRetrievedStub = sinon.stub();

      ConversationClient.getAllConversations(onConversationRetrievedStub);

      sinon.assert.notCalled(onConversationRetrievedStub);

      streamStub.listen.yield({ id: 1, body: 'body' });

      sinon.assert.calledOnce(onConversationRetrievedStub);
      sinon.assert.calledWith(
        onConversationRetrievedStub, sinon.match({ id: 1, body: 'body'})
      );
      assert.instanceOf(onConversationRetrievedStub.lastCall.args[0], Thread);

      streamStub.listen.yield({ id: 2, body: 'body2' });

      sinon.assert.calledTwice(onConversationRetrievedStub);
      sinon.assert.calledWith(
        onConversationRetrievedStub, sinon.match({ id: 2, body: 'body2'})
      );
      assert.instanceOf(onConversationRetrievedStub.lastCall.args[0], Thread);
    });

    test('is resolved when stream.closed is resolved', function(done) {
      var resolveStub = sinon.stub();

      var streamPromise = ConversationClient.getAllConversations(() => {}).then(
        resolveStub
      );

      Promise.resolve().then(() => {
        sinon.assert.notCalled(resolveStub);

        resolveStream();

        return streamPromise;
      }).then(() => {
        sinon.assert.calledOnce(resolveStub);
      }).then(done, done);
    });

    test('is rejected when stream.closed is rejected', function(done) {
      var rejectStub = sinon.stub();
      var error = new Error('Error');

      var streamPromise = ConversationClient.getAllConversations(() => {}).then(
        () => { throw new Error('getAllConversations should be rejected'); },
        rejectStub
      );

      Promise.resolve().then(() => {
        sinon.assert.notCalled(rejectStub);

        rejectStream(error);

        return streamPromise;
      }).catch(() => {
        sinon.assert.calledWith(rejectStub, error);
      }).then(done, done);
    });
  });
});
