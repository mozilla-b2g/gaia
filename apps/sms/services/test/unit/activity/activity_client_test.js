/*global ActivityClient,
         MocksHelper,
         bridge
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/shared/js/event_dispatcher.js');
require('/services/js/activity/activity_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge'
]).init();

suite('ActivityClient >', function() {
  var clientStub;

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    clientStub = sinon.stub({
      on: () => {},
      off: () => {},
      method: () => {}
    });

    this.sinon.stub(bridge, 'client').returns(clientStub);

    ActivityClient.init();

    assert.isFalse(ActivityClient.hasPendingRequest());
  });

  teardown(function() {
    ActivityClient.offAll();
  });

  test('bridge client is correctly initialized', function() {
    sinon.assert.calledOnce(bridge.client);
    sinon.assert.calledWith(bridge.client, 'activity-service', window);
  });

  test('postResult throws if there is no activity request', function(done) {
    ActivityClient.postResult('Result').then(() => {
      throw new Error('postResult should be rejected!');
    }, (e) => {
      assert.instanceOf(e, Error);
    }).then(done, done);
  });

  test('postError throws if there is no activity request', function(done) {
    ActivityClient.postError('Error').then(() => {
      throw new Error('postError should be rejected!');
    }, (e) => {
      assert.instanceOf(e, Error);
    }).then(done, done);
  });


  suite('handling incoming activity requests> ', function() {
    teardown(function() {
      ActivityClient.offAll();
    });

    test('post error on concurrent request attempt', function() {
      var onShareActivityRequest = sinon.stub();

      ActivityClient.on('share-activity-request', onShareActivityRequest);

      clientStub.on.withArgs('activity-request').yield({
        name: 'share',
        data: { body: 'text' }
      });

      assert.isTrue(ActivityClient.hasPendingRequest());
      sinon.assert.calledOnce(onShareActivityRequest);

      clientStub.on.withArgs('activity-request').yield({
        name: 'share',
        data: { body: 'text' }
      });

      sinon.assert.calledOnce(onShareActivityRequest);
      sinon.assert.calledWith(
        clientStub.method, 'postError', sinon.match.string
      );
      assert.isFalse(ActivityClient.hasPendingRequest());
    });

    test('notifies about "share" activity request', function() {
      var onShareActivityRequest = sinon.stub();
      var onNewActivityRequest = sinon.stub();

      ActivityClient.on('share-activity-request', onShareActivityRequest);
      ActivityClient.on('new-activity-request', onNewActivityRequest);

      clientStub.on.withArgs('activity-request').yield({
        name: 'share',
        data: { body: 'text' }
      });

      sinon.assert.notCalled(onNewActivityRequest);
      sinon.assert.calledOnce(onShareActivityRequest);
      sinon.assert.calledWith(onShareActivityRequest, { body: 'text' });
    });

    test('notifies about "new" activity request', function() {
      var onShareActivityRequest = sinon.stub();
      var onNewActivityRequest = sinon.stub();

      ActivityClient.on('share-activity-request', onShareActivityRequest);
      ActivityClient.on('new-activity-request', onNewActivityRequest);

      clientStub.on.withArgs('activity-request').yield({
        name: 'new',
        data: { number: '+123' }
      });

      sinon.assert.notCalled(onShareActivityRequest);
      sinon.assert.calledOnce(onNewActivityRequest);
      sinon.assert.calledWith(onNewActivityRequest, { number: '+123' });
    });
  });

  suite('responding to activity request >', function() {
    setup(function() {
      clientStub.on.withArgs('activity-request').yield({
        name: 'new',
        data: { number: '+123' }
      });

      assert.isTrue(ActivityClient.hasPendingRequest());
    });

    test('postResult correctly handles successful method call', function(done) {
      clientStub.method.returns(Promise.resolve());

      ActivityClient.postResult('Result').then(() => {
        sinon.assert.calledOnce(clientStub.method);
        sinon.assert.calledWith(clientStub.method, 'postResult', 'Result');

        assert.isFalse(ActivityClient.hasPendingRequest());
      }).then(done, done);
    });

    test('postResult correctly handles failed method call', function(done) {
      var rejectReason = new Error('Fake reason');

      clientStub.method.returns(Promise.reject(rejectReason));

      ActivityClient.postResult('Result').then(() => {
        throw new Error('postResult should be rejected!');
      }, (e) => {
        sinon.assert.calledOnce(clientStub.method);
        sinon.assert.calledWith(clientStub.method, 'postResult', 'Result');

        assert.isFalse(ActivityClient.hasPendingRequest());

        assert.equal(e, rejectReason);
      }).then(done, done);
    });

    test('postError correctly handles successful method call', function() {
      ActivityClient.postError('Error');

      sinon.assert.calledOnce(clientStub.method);
      sinon.assert.calledWith(clientStub.method, 'postError', 'Error');

      assert.isFalse(ActivityClient.hasPendingRequest());
    });

    test('postError correctly handles failed method call', function(done) {
      var rejectReason = new Error('Fake reason');

      clientStub.method.returns(Promise.reject(rejectReason));

      ActivityClient.postError('Error').then(() => {
        throw new Error('postError should be rejected!');
      }, (e) => {
        sinon.assert.calledOnce(clientStub.method);
        sinon.assert.calledWith(clientStub.method, 'postError', 'Error');

        assert.isFalse(ActivityClient.hasPendingRequest());

        assert.equal(e, rejectReason);
      }).then(done, done);
    });
  });
});
