/*global ActivityShim,
         MocksHelper,
         bridge
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/shared/js/event_dispatcher.js');
require('/services/js/activity/activity_shim.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge'
]).init();

suite('ActivityShim >', function() {
  var serviceStub, realSetMessageHandler, realHasPendingMessage, appInstanceId;

  MocksHelperForAttachment.attachTestHelpers();

  suiteSetup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    realHasPendingMessage = navigator.mozHasPendingMessage;

    navigator.mozSetMessageHandler = () => {};
    navigator.mozHasPendingMessage = () => {};
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozHasPendingMessage = realHasPendingMessage;
  });

  setup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      broadcast: () => {}
    });

    this.sinon.stub(bridge, 'service').returns(serviceStub);
    this.sinon.stub(navigator, 'mozSetMessageHandler');
    this.sinon.stub(navigator, 'mozHasPendingMessage');

    // It should throw if app instance id is not specified.
    assert.throws(() => ActivityShim.init());

    ActivityShim.init(appInstanceId = Date.now());
  });

  test('bridge service is correctly initialized', function() {
    sinon.assert.calledOnce(bridge.service);
    sinon.assert.calledWith(bridge.service, 'activity-service' + appInstanceId);
  });

  test('hasPendingRequest based on mozHasPendingMessage', function() {
    navigator.mozHasPendingMessage.withArgs('activity').returns(false);

    assert.isFalse(ActivityShim.hasPendingRequest());

    navigator.mozHasPendingMessage.withArgs('activity').returns(true);

    assert.isTrue(ActivityShim.hasPendingRequest());
  });

  suite('activity system message >', function() {
    var activityRequest;

    setup(function() {
      this.sinon.useFakeTimers();

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

      navigator.mozSetMessageHandler.withArgs('activity').yield(
        activityRequest
      );

      this.sinon.clock.tick();
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
      sinon.assert.calledWith(activityRequest.postResult, { custom: 'custom' });

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
