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
    test('client is initialized', function() {
      MessagingClient.init();

      sinon.assert.calledWith(bridge.client, {
        service: 'messaging-service',
        endpoint: sinon.match.instanceOf(SharedWorker),
        timeout: false
      });
    });
  });

  Object.keys(METHODS).forEach((method) => {
    setup(function() {
      MessagingClient.init();
    });

    suite(method, function() {
      var params = METHODS[method];

      test('onsuccess', function(done) {
        clientStub.method.withArgs(method, ...params).returns(
          Promise.resolve(successResult)
        );

        MessagingClient[method](...params).then((result) => {
          sinon.assert.calledWithExactly(clientStub.method, method, ...params);
          assert.equal(successResult, result);
        }).then(done, done);
      });

      test('onerror', function(done) {
        clientStub.method.withArgs(method, ...params).returns(
          Promise.reject(errorResult)
        );

        MessagingClient[method](...params).then(() => { 
          throw new Error('Promise should not be resolved!');
        }, (error) => {
          sinon.assert.calledWithExactly(clientStub.method, method, ...params);
          assert.deepEqual(errorResult, error);
        }).then(done, done);
      });
    });    
  });
});
