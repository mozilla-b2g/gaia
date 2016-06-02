/*global bridge,
         BroadcastChannel,
         MozMobileConnectionsClient,
         MocksHelper
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/services/js/moz_mobile_connections/moz_mobile_connections_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel'
]).init();

suite('MozMobileConnectionsClient >', function() {
  var clientStub;
  var APP_INSTANCE_ID = 'fake-id';

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    clientStub = sinon.stub({
      method: () => {}
    });

    this.sinon.stub(bridge, 'client').returns(clientStub);
  });

  suite('init', function() {
    test('throws if app instance id is not provided', function() {
      assert.throws(() => MozMobileConnectionsClient.init());
    });

    test('client is initialized', function() {
      MozMobileConnectionsClient.init(APP_INSTANCE_ID);

      sinon.assert.calledWith(bridge.client, {
        service: 'moz-mobile-connections-shim',
        endpoint: sinon.match.instanceOf(BroadcastChannel).and(
          sinon.match.has(
            'name',
            'moz-mobile-connections-shim-channel-' + APP_INSTANCE_ID
          )
        ),
        timeout: false
      });
    });
  });

  suite('switchMmsSimHandler method', function() {
    setup(function() {
      MozMobileConnectionsClient.init(APP_INSTANCE_ID);
    });

    test('client method is called with correct parameter', function() {
      var iccId = 123;
      var fakePromise = 'fakePromise';

      clientStub.method.withArgs('switchMmsSimHandler', iccId).returns(
        fakePromise
      );
      assert.equal(
        fakePromise,
        MozMobileConnectionsClient.switchMmsSimHandler(iccId)
      );
      sinon.assert.calledWithMatch(
        clientStub.method,
        'switchMmsSimHandler',
        iccId
      );
    });
  });
});
