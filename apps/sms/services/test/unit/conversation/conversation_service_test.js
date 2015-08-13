/*global bridge,
         BroadcastChannel,
         ConversationService,
         Drafts,
         MocksHelper
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/test/unit/mock_drafts.js');
require('/services/js/bridge_service_mixin.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/services/js/conversation/conversation_service.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel',
  'Drafts',
  'Draft',
  'streamClient',
  'streamService'
]).init();

suite('ConversationService >', function() {
  var serviceStub, mobileMessageClientStub, mobileMessageStreamStub;

  function matchMobileMessageShim(channelName) {
    return {
      service: 'moz-mobile-message-shim',
      endpoint: sinon.match.instanceOf(BroadcastChannel).and(
        sinon.match.has('name', channelName)
      )
    };
  }

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      stream: () => {},
      broadcast: () => {},
      listen: () => {},
      plugin: () => {}
    });

    mobileMessageClientStub = sinon.stub({
      stream: () => {},
      plugin: () => {},
      disconnect: () => {}
    });
    mobileMessageClientStub.plugin.returns(mobileMessageClientStub);

    this.sinon.spy(self, 'BroadcastChannel');

    this.sinon.stub(bridge, 'service').withArgs('conversation-service').returns(
      serviceStub
    );

    this.sinon.stub(bridge, 'client').withArgs(
      matchMobileMessageShim('moz-mobile-message-shim-channel-1')
    ).returns(mobileMessageClientStub);

    ConversationService.init();
  });

  suite('getAllConversations >', function() {
    var serviceStreamStub, resolveMobileMessageStream,
        rejectMobileMessageStream, drafts, threadDraft, threads;

    function threadToConversationSummary(thread, threadDraft) {
      return {
        id: thread.id,
        participants: thread.participants,
        body: thread.body,
        timestamp: thread.timestamp,
        status: { hasUnread: thread.unreadCount > 0, hasNewError: false },
        lastMessageType: thread.lastMessageType,
        draft: threadDraft || null
      };
    }

    function draftToConversationSummary(draft) {
      return {
        id: draft.id,
        participants: draft.recipients,
        body: draft.content[0],
        timestamp: new Date(draft.timestamp),
        status: { hasUnread: false, hasNewError: false },
        lastMessageType: draft.type || 'sms',
        draft: draft
      };
    }

    setup(function() {
      serviceStreamStub = sinon.stub({
        write: () => {},
        close: () => {},
        abort: () => {}
      });

      mobileMessageStreamStub = sinon.stub({
        listen: () => {},
        cancel: () => {},
        closed: new Promise((resolve, reject) => {
          resolveMobileMessageStream = resolve;
          rejectMobileMessageStream = reject;
        })
      });

      mobileMessageClientStub.stream.withArgs('getThreads').returns(
        mobileMessageStreamStub
      );

      drafts = [{
        id: 1,
        recipients: ['+1'],
        content: ['body1'],
        type: 'sms',
        timestamp: 1
      }, {
        id: 3,
        recipients: ['a@abc.xyz'],
        content: ['body3'],
        type: 'mms',
        timestamp: 3
      }];

      threadDraft = {
        id: 100,
        recipients: ['+100'],
        content: ['body100'],
        type: 'sms',
        threadId: 5,
        timestamp: 100
      };

      threads = [{
        id: 2,
        participants: ['+2'],
        body: 'body2',
        timestamp: 2,
        unreadCount: 0,
        lastMessageType: 'sms'
      }, {
        id: 4,
        participants: ['a@abc.xyz'],
        body: 'body4',
        timestamp: 4,
        unreadCount: 1,
        lastMessageType: 'mms'
      }, {
        id: 5,
        participants: ['+5'],
        body: 'body5',
        timestamp: 5,
        unreadCount: 0,
        lastMessageType: 'sms'
      }];

      // Sort threads in the reverse order.
      threads.sort((threadA, threadB) => threadB.timestamp - threadA.timestamp);

      this.sinon.stub(Drafts, 'getAllThreadless').returns(drafts.slice());
      this.sinon.stub(Drafts, 'byThreadId').returns(null);
      Drafts.byThreadId.withArgs(5).returns(threadDraft);
    });

    test('spawns mobileMessageClient for every app instance', function() {
      // Prepare stub for the second app instance.
      var mobileMessageClientStub2 = sinon.stub({
        stream: () => {},
        plugin: () => {},
        disconnect: () => {}
      });
      mobileMessageClientStub2.plugin.returns(mobileMessageClientStub2);
      mobileMessageClientStub2.stream.withArgs('getThreads').returns(
        mobileMessageStreamStub
      );

      bridge.client.withArgs(
        matchMobileMessageShim('moz-mobile-message-shim-channel-2')
      ).returns(mobileMessageClientStub2);

      // Request stream from app instance with ID = 1.
      ConversationService.getAllConversations(serviceStreamStub, 1);

      sinon.assert.calledOnce(bridge.client);
      sinon.assert.calledWith(
        bridge.client,
        matchMobileMessageShim('moz-mobile-message-shim-channel-1')
      );
      sinon.assert.calledOnce(mobileMessageClientStub.stream);
      sinon.assert.calledWith(mobileMessageClientStub.stream, 'getThreads');

      // Request stream from app instance with ID = 2.
      ConversationService.getAllConversations(serviceStreamStub, 2);

      sinon.assert.calledTwice(bridge.client);
      sinon.assert.calledWith(
        bridge.client,
        matchMobileMessageShim('moz-mobile-message-shim-channel-2')
      );
      sinon.assert.calledOnce(mobileMessageClientStub2.stream);
      sinon.assert.calledWith(mobileMessageClientStub2.stream, 'getThreads');

      // Once we created client for the app instance we should reuse for
      // consequent requests.
      bridge.client.reset();

      ConversationService.getAllConversations(serviceStreamStub, 1);
      sinon.assert.notCalled(bridge.client);
      sinon.assert.calledTwice(mobileMessageClientStub.stream);

      serviceStub.stream.withArgs('getAllConversations').yield(
        serviceStreamStub, 2
      );
      sinon.assert.notCalled(bridge.client);
      sinon.assert.calledTwice(mobileMessageClientStub2.stream);
    });

    test('mobileMessage stream is cancelled if main stream is cancelled',
    function() {
      ConversationService.getAllConversations(serviceStreamStub, 1);

      serviceStreamStub.cancel('ReAsOn');

      sinon.assert.calledOnce(mobileMessageStreamStub.cancel);
      sinon.assert.calledWith(mobileMessageStreamStub.cancel, 'ReAsOn');
    });

    test('threads and drafts are returned in the correct order',
    function(done) {
      var getAllConversationsPromise = ConversationService.getAllConversations(
        serviceStreamStub, 1
      );

      threads.forEach((thread) => {
        mobileMessageStreamStub.listen.yield(thread);
      });

      resolveMobileMessageStream();

      getAllConversationsPromise.then(() => {
        sinon.assert.callCount(serviceStreamStub.write, 5);
        sinon.assert.callOrder(
          serviceStreamStub.write.withArgs(
            sinon.match(threadToConversationSummary(threads[0], threadDraft))
          ),
          serviceStreamStub.write.withArgs(
            sinon.match(threadToConversationSummary(threads[1]))
          ),
          serviceStreamStub.write.withArgs(
            sinon.match(draftToConversationSummary(drafts[1]))
          ),
          serviceStreamStub.write.withArgs(
            sinon.match(threadToConversationSummary(threads[2]))
          ),
          serviceStreamStub.write.withArgs(
            sinon.match(draftToConversationSummary(drafts[0]))
          )
        );
      }).then(done, done);
    });

    test('only drafts are returned if there is no threads', function(done) {
      var getAllConversationsPromise = ConversationService.getAllConversations(
        serviceStreamStub, 1
      );

      resolveMobileMessageStream();

      getAllConversationsPromise.then(() => {
        sinon.assert.callCount(serviceStreamStub.write, 2);
        sinon.assert.callOrder(
          serviceStreamStub.write.withArgs(
            sinon.match(draftToConversationSummary(drafts[1]))
          ),
          serviceStreamStub.write.withArgs(
            sinon.match(draftToConversationSummary(drafts[0]))
          )
        );
      }).then(done, done);
    });

    test('stream is closed when mobileMessageStream is successfully closed',
    function(done) {
      var getAllConversationsPromise = ConversationService.getAllConversations(
        serviceStreamStub, 1
      );

      resolveMobileMessageStream();

      getAllConversationsPromise.then(() => {
        sinon.assert.called(serviceStreamStub.close);
      }, () => {
        throw new Error('getAllConversations should always be resolved');
      }).then(done, done);
    });

    test('stream is aborted when mobileMessageStream is unexpectedly closed',
    function(done) {
      var getAllConversationsPromise = ConversationService.getAllConversations(
        serviceStreamStub, 1
      );

      rejectMobileMessageStream(new Error('Exception'));

      getAllConversationsPromise.then(() => {
        sinon.assert.calledWith(serviceStreamStub.abort, '[Error] Exception');
      }, () => {
        throw new Error('getAllConversations should always be resolved');
      }).then(done, done);
    });
  });
});
