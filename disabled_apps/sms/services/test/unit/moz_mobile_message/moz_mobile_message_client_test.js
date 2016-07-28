/*global bridge,
         BroadcastChannel,
         MozMobileMessageClient,
         MocksHelper,
         streamClient
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/services/js/moz_mobile_message/moz_mobile_message_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel',
  'streamClient'
]).init();

suite('MozMobileMessageClient >', function() {
  var clientStub;

  function matchMobileMessageShim(channelName) {
    return {
      service: 'moz-mobile-message-shim',
      endpoint: sinon.match.instanceOf(BroadcastChannel).and(
        sinon.match.has('name', channelName)
      ),
      timeout: false
    };
  }

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    clientStub = sinon.stub({
      method: () => {},
      stream: () => {},
      plugin: () => {}
    });
    clientStub.plugin.returns(clientStub);

    this.sinon.spy(self, 'BroadcastChannel');

    this.sinon.stub(bridge, 'client').withArgs(
      matchMobileMessageShim('moz-mobile-message-shim-channel-1')
    ).returns(clientStub);
  });

  teardown(function() {
    MozMobileMessageClient.cleanup();
  });

  test('throws if app instance id is not provided', function() {
    assert.throws(() => MozMobileMessageClient.forApp());
  });

  test('spawns bridge client for every app instance', function() {
    // Prepare stub for the second app instance.
    var clientStub2 = sinon.stub({
      method: () => {},
      stream: () => {},
      plugin: () => {}
    });
    clientStub2.plugin.returns(clientStub2);

    bridge.client.withArgs(
      matchMobileMessageShim('moz-mobile-message-shim-channel-2')
    ).returns(clientStub2);

    var mobileMessageClient1 = MozMobileMessageClient.forApp(1);
    sinon.assert.calledOnce(bridge.client);
    sinon.assert.calledWith(
      bridge.client,
      matchMobileMessageShim('moz-mobile-message-shim-channel-1')
    );
    sinon.assert.calledWith(clientStub.plugin, streamClient);

    var mobileMessageClient2 = MozMobileMessageClient.forApp(2);
    sinon.assert.calledTwice(bridge.client);
    sinon.assert.calledWith(
      bridge.client,
      matchMobileMessageShim('moz-mobile-message-shim-channel-2')
    );
    sinon.assert.calledWith(clientStub2.plugin, streamClient);

    // Once we created client for the app instance we should reuse for
    // consequent requests.
    bridge.client.reset();

    MozMobileMessageClient.forApp(1);
    MozMobileMessageClient.forApp(2);

    sinon.assert.notCalled(bridge.client);

    // Check that method calls go to the correct client.
    mobileMessageClient1.send();
    sinon.assert.calledOnce(clientStub.method);
    sinon.assert.notCalled(clientStub2.method);

    mobileMessageClient2.send();
    sinon.assert.calledOnce(clientStub.method);
    sinon.assert.calledOnce(clientStub2.method);
  });

  suite('method calls', function() {
    var mobileMessageClient, methodResult, streamResult;
    setup(function() {
      methodResult = sinon.stub();
      streamResult = sinon.stub();

      clientStub.method.returns(methodResult);
      clientStub.stream.returns(streamResult);

      mobileMessageClient = MozMobileMessageClient.forApp(1);
    });

    test('send is correctly forwarded to bridge client', function() {
      mobileMessageClient.send('recipient', 'content', { serviceId: 100 });

      sinon.assert.calledWith(
        clientStub.method, 'send', 'recipient', 'content', { serviceId: 100 }
      );
    });

    test('sendMMS is correctly forwarded to bridge client', function() {
      var mmsOptions =  {
        receivers: ['+1'],
        subject: 'subject',
        smil: 'smil',
        attachments: [{}]
      };

      mobileMessageClient.sendMMS(mmsOptions, { serviceId: 100 });

      sinon.assert.calledWith(
        clientStub.method, 'sendMMS', mmsOptions, { serviceId: 100 }
      );
    });

    test('retrieveMMS is correctly forwarded to bridge client', function() {
      mobileMessageClient.retrieveMMS(100);

      sinon.assert.calledWith(clientStub.method, 'retrieveMMS', 100);
    });

    test('delete is correctly forwarded to bridge client', function() {
      mobileMessageClient.delete(100);

      sinon.assert.calledWith(clientStub.method, 'delete', 100);
    });

    test('getThreads is correctly forwarded to bridge client', function() {
      mobileMessageClient.getThreads();

      sinon.assert.calledWith(clientStub.stream, 'getThreads');
    });
  });
});
