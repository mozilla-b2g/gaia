/*global bridge,
         MessagingClient,
         MocksHelper
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/js/messaging/messaging_client.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
]).init();

suite('Messaging Client >', function() {

  MocksHelperForAttachment.attachTestHelpers();

  const APP_INSTANCE_ID = 'fake-app-instance-id';

  var clientStub;
  var successResult = {};
  var errorResult = new Error();
  const METHODS = {
    'sendSMS': [{
      recipients: '123',
      content: 'hola'
    }],
    'sendMMS': [{
      receivers: ['123'],
      subject: null,
      smil: 'fake smil',
      attachments: 'fake attachments'
    }],
    'resendMessage': [{
      id: 'fake message'
    }],
    'retrieveMMS': [1]
  };

  setup(function() {
    clientStub = sinon.stub({
      method: () => {}
    });

    this.sinon.stub(bridge, 'client').returns(clientStub);
  });

  suite('init', function() {
    test('throws if app instance id is not provided', function() {
      assert.throws(() => MessagingClient.forApp());
    });

    test('client is initialized', function() {
      MessagingClient.init(APP_INSTANCE_ID);

      sinon.assert.calledWith(bridge.client, {
        service: 'messaging-service',
        endpoint: sinon.match.instanceOf(SharedWorker),
        timeout: false
      });
    });
  });

  Object.keys(METHODS).forEach((method) => {
    setup(function() {
      MessagingClient.init(APP_INSTANCE_ID);
    });

    suite(method, function() {
      var params = METHODS[method];

      test('onsuccess', function(done) {
        clientStub.method.withArgs(method, ...params, APP_INSTANCE_ID).returns(
          Promise.resolve(successResult)
        );

        MessagingClient[method](...params).then((result) => {
          sinon.assert.calledWithExactly(
            clientStub.method, method, ...params, APP_INSTANCE_ID
          );
          assert.equal(successResult, result);
        }).then(done, done);
      });

      test('onerror', function(done) {
        clientStub.method.withArgs(method, ...params, APP_INSTANCE_ID).returns(
          Promise.reject(errorResult)
        );

        MessagingClient[method](...params).then(() => {
          throw new Error('Promise should not be resolved!');
        }, (error) => {
          sinon.assert.calledWithExactly(
            clientStub.method, method, ...params, APP_INSTANCE_ID
          );
          assert.deepEqual(errorResult, error);
        }).then(done, done);
      });
    });
  });
});
