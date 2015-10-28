/*global ActivityShim,
         bridge,
         BroadcastChannel,
         MocksHelper
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/shared/js/event_dispatcher.js');
require('/services/js/bridge_service_mixin.js');
require('/services/js/activity/activity_shim.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel'
]).init();

suite('ActivityShim >', function() {
  const APP_INSTANCE_ID = 'fake-app-id';

  var serviceStub, setMessageHandlerStub;

  MocksHelperForAttachment.attachTestHelpers();
  setup(function() {
    this.sinon.useFakeTimers();

    serviceStub = sinon.stub({
      method: () => {},
      broadcast: () => {},
      listen: () => {},
      on: () => {}
    });

    setMessageHandlerStub = sinon.stub();

    this.sinon.stub(bridge, 'service').returns(serviceStub);
  });

  suite('init()', function() {
    test('throws if app instance id is not provided', function() {
      assert.throws(() => ActivityShim.init());
    });

    test('bridge service is correctly initialized', function() {
      ActivityShim.init(APP_INSTANCE_ID, setMessageHandlerStub);

      sinon.assert.calledOnce(bridge.service);
      sinon.assert.calledWith(bridge.service, 'activity-service');
      sinon.assert.calledTwice(serviceStub.listen);
      sinon.assert.calledWith(
        serviceStub.listen,
        sinon.match.instanceOf(BroadcastChannel).and(
          sinon.match.has(
            'name',
            'activity-service-channel-' + APP_INSTANCE_ID
          )
        )
      );
    });
  });

  suite('activity system message >', function() {
    setup(function() {
      ActivityShim.init(APP_INSTANCE_ID, setMessageHandlerStub);
    });

    test('when client is not connected yet', function() {
      sinon.assert.notCalled(setMessageHandlerStub);
    });

    suite('once client is connected', function() {
      var activityRequest;

      setup(function() {
        activityRequest = sinon.stub({
          postResult: () => {},
          postError: () => {},
          source: {
            name: 'fake',
            data: {
              custom: 'custom'
            }
          }
        });

        serviceStub.on.withArgs('connected').yield();

        setMessageHandlerStub.withArgs('activity').yield(activityRequest);
      });

      test('activity request is broadcasted', function() {
        sinon.assert.calledWith(
          serviceStub.broadcast, 'activity-request', activityRequest.source
        );
      });

      test('postResult passes default arguments', function() {
        serviceStub.method.withArgs('postResult').yield();

        sinon.assert.calledOnce(activityRequest.postResult);
        sinon.assert.calledWith(activityRequest.postResult, { success: true });

        // Activity request is disposed after first postResult.
        assert.throw(() => {
          serviceStub.method.withArgs('postResult').yield();
        });

        sinon.assert.calledOnce(activityRequest.postResult);
      });

      test('postResult passes custom arguments', function() {
        serviceStub.method.withArgs('postResult').yield({ custom: 'custom' });

        sinon.assert.notCalled(activityRequest.postError);
        sinon.assert.calledOnce(activityRequest.postResult);
        sinon.assert.calledWith(
          activityRequest.postResult, { custom: 'custom' }
        );

        // Activity request is disposed after first postResult.
        assert.throw(() => {
          serviceStub.method.withArgs('postResult').yield({ custom: 'custom' });
        });

        sinon.assert.calledOnce(activityRequest.postResult);
      });

      test('postError passes error reason', function() {
        serviceStub.method.withArgs('postError').yield('error');

        sinon.assert.notCalled(activityRequest.postResult);
        sinon.assert.calledOnce(activityRequest.postError);
        sinon.assert.calledWith(activityRequest.postError, 'error');

        // Activity request is disposed after first postError.
        assert.throw(() => {
          serviceStub.method.withArgs('postError').yield('error');
        });

        sinon.assert.calledOnce(activityRequest.postError);
      });
    });
  });
});
