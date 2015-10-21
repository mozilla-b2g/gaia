/*global bridge,
         BroadcastChannel,
         MessagingService,
         MocksHelper,
         MockMessages,
         Settings,
         SMIL
*/

'use strict';

require('/services/js/bridge_service_mixin.js');
require('/services/test/unit/mock_bridge.js');
require('/views/shared/test/unit/mock_messages.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_smil.js');
require('/services/js/messaging/messaging_service.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'Settings',
  'SMIL'
]).init();

suite('Messaging service >', function() {
  var serviceStub, clientStub, successResult, errorResult;

  MocksHelperForAttachment.attachTestHelpers();

  setup(function() {
    successResult = {};
    errorResult = new Error();

    serviceStub = sinon.stub({
      method: () => {},
      stream: () => {},
      broadcast: () => {},
      listen: () => {},
      plugin: () => {}
    });

    clientStub = sinon.stub({
      method: () => {}
    });

    this.sinon.stub(bridge, 'service').returns(serviceStub);
    this.sinon.stub(bridge, 'client').returns(clientStub);

    MessagingService.init();
  });

  suite('init', function() {
    test('service mixing and client are initialized', function() {
      sinon.assert.calledWith(bridge.service, 'messaging-service');
      sinon.assert.calledWith(bridge.client, {
        service: 'moz-mobile-message-shim',
        endpoint: sinon.match.instanceOf(BroadcastChannel),
        timeout: false
      });
    });
  });

  suite('sendSMS', function() {
    var smsOpts;

    test('send to one recipient successfully', function(done) {
      smsOpts = {
        recipients: '123',
        content: 'hola'
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then((results) => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, undefined
        );

        assert.deepEqual(results, [{
          success: true,
          result: successResult,
          code: undefined,
          recipient: '123'
        }]);
      }).then(done, done);
    });

    test('send to two recipients successfully', function(done) {
      smsOpts = {
        recipients: ['123', '456'],
        content: 'hola'
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then((results) => {
        sinon.assert.calledTwice(clientStub.method);

        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients[0], smsOpts.content, undefined
        );

        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients[1], smsOpts.content, undefined
        );

        results.forEach((result, idx) => {
          assert.deepEqual(result, {
            success: true,
            result: successResult,
            code: undefined,
            recipient: smsOpts.recipients[idx]
          });          
        });
      }).then(done, done);

    });

    test('send to one recipient unsuccessfully', function(done) {
      smsOpts = {
        recipients: '123',
        content: 'hola'
      };

      clientStub.method
        .withArgs('send').returns(Promise.reject(errorResult));
      MessagingService.sendSMS(smsOpts).then((results) => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, undefined
        );

        assert.deepEqual(results, [{
          success: false,
          result: undefined,
          code: errorResult,
          recipient: '123'
        }]);
      }).then(done, done);
    });

    test('send to two recipients unsuccessfully', function(done) {
      smsOpts = {
        recipients: ['123', '456'],
        content: 'hola'
      };

      clientStub.method
        .withArgs('send').returns(Promise.reject(errorResult));
      MessagingService.sendSMS(smsOpts).then((results) => {
        sinon.assert.calledTwice(clientStub.method);

        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients[0], smsOpts.content, undefined
        );

        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients[1], smsOpts.content, undefined
        );

        results.forEach((result, idx) => {
          assert.deepEqual(result, {
            success: false,
            result: undefined,
            code: errorResult,
            recipient: smsOpts.recipients[idx]
          });
        });
      }).then(done, done);
    });

    test('send with a serviceId in dual SIM setup', function(done) {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 0 // we use 0 because it's falsy, to test it still works
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then(() => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, { serviceId: 0 }
        );
      }).then(done, done);

    });

    test('send with a serviceId in non-dual SIM setup', function(done) {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);
      smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 1
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then(() => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, undefined
        );
      }).then(done, done);

    });

    test('serviceId is a string containing a number', function(done) {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: '0'
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then(() => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, { serviceId: 0 }
        );
      }).then(done, done);

    });

    test('serviceId is a bad string', function(done) {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 'oirutoirutoitr'
      };

      clientStub.method
        .withArgs('send').returns(Promise.resolve(successResult));
      MessagingService.sendSMS(smsOpts).then(() => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'send', smsOpts.recipients, smsOpts.content, undefined
        );
      }).then(done, done);
    });
  });

  suite('sendMMS', function() {
    var smil;

    setup(function() {
      smil = {
        smil: {},
        attachments: {}
      };
      this.sinon.stub(SMIL, 'generate').returns(smil);
    });

    test('send to one recipient successfully', function(done) {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola'
      };

      clientStub.method
        .withArgs('sendMMS').returns(Promise.resolve(successResult));
      MessagingService.sendMMS(mmsOpts).then((result) => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'sendMMS',
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, /* send options */ undefined
        );
        assert.equal(result, successResult);
      }).then(done, done);
    });

    test('send to two recipients successfully', function(done) {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola'
      };

      clientStub.method
        .withArgs('sendMMS').returns(Promise.resolve(successResult));
      MessagingService.sendMMS(mmsOpts).then((result) => {
        sinon.assert.calledWithExactly(
          clientStub.method,
          'sendMMS',
          {
            receivers: ['123', '456'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, /* send options */ undefined
        );
        assert.equal(result, successResult);
      }).then(done, done);
    });

    test('send to one recipient unsuccessfully', function(done) {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola'
      };

      clientStub.method
        .withArgs('sendMMS').returns(Promise.reject(errorResult));
      MessagingService.sendMMS(mmsOpts).catch((error) => {
        assert.equal(error, errorResult);
      }).then(done, done);
    });

    test('send to two recipients unsuccessfully', function(done) {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola'
      };

      clientStub.method
        .withArgs('sendMMS').returns(Promise.reject(errorResult));
      MessagingService.sendMMS(mmsOpts).catch((error) => {
        assert.equal(error, errorResult);
      }).then(done, done);
    });

    suite('send with a serviceId', function() {
      var mmsOpts;

      setup(function() {
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);

        mmsOpts = {
          recipients: '123',
          subject: null,
          content: 'hola',
          // we use 0 to check that the code behaves correctly with falsy values
          serviceId: 0
        };

        clientStub.method
          .withArgs('sendMMS').returns(Promise.resolve(successResult));
      });

      test('while the current serviceId is the same', function(done) {
        Settings.mmsServiceId = 0;

        MessagingService.sendMMS(mmsOpts).then(() => {
          sinon.assert.calledWithExactly(
            clientStub.method,
            'sendMMS',
            {
              receivers: ['123'],
              subject: null,
              smil: smil.smil,
              attachments: smil.attachments
            }, {
              serviceId: mmsOpts.serviceId
            }
          );
        }).then(done, done);
      });

      test('while the current serviceId is different', function(done) {
        Settings.mmsServiceId = 1;

        MessagingService.sendMMS(mmsOpts).then(() => {
          sinon.assert.calledWithExactly(
            clientStub.method,
            'sendMMS',
            {
              receivers: ['123'],
              subject: null,
              smil: smil.smil,
              attachments: smil.attachments
            }, {
              serviceId: mmsOpts.serviceId
            }
          );
        }).then(done, done);
      });

      test('on a non-dual sim setup with different serviceId', function(done) {
        Settings.hasSeveralSim.returns(false);
        Settings.mmsServiceId = 1;

        MessagingService.sendMMS(mmsOpts).then(() => {
          sinon.assert.calledWithExactly(
            clientStub.method,
            'sendMMS',
            {
              receivers: ['123'],
              subject: null,
              smil: smil.smil,
              attachments: smil.attachments
            }, undefined);
        }).then(done, done);
      });

      test('serviceId is a string containing a number', function(done) {
        mmsOpts.serviceId = '0';
        Settings.mmsServiceId = 0;

        MessagingService.sendMMS(mmsOpts).then(() => {
          sinon.assert.calledWith(
            clientStub.method,
            'sendMMS',
            sinon.match.any, { serviceId: 0 }
          );
        }).then(done, done);
      });

      test('serviceId is a bad string', function(done) {
        mmsOpts.serviceId = 'hjuoriut';
        Settings.mmsServiceId = 0;

        MessagingService.sendMMS(mmsOpts).then(() => {
          sinon.assert.calledWithExactly(
            clientStub.method,
            'sendMMS',
            sinon.match.any, undefined
          );
        }).then(done, done);
      });
    });
  });

  suite('resendMessage', function() {

    setup(function() {
      clientStub.method.withArgs('delete').returns(Promise.resolve());
    });

    test('fails if message is not given', function() {
      assert.throws(function() {
        MessagingService.resendMessage();
      });
    });

    suite('SMS message', function() {
      var message;

      setup(function() {
        message = MockMessages.sms({
          iccId: 100
        });
      });

      test('uses message iccId to retrieve service Id in case of multiple SIMs',
      function(done) {
        var serviceId = 3;

        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(serviceId);

        clientStub.method
          .withArgs('send').returns(Promise.resolve(successResult));
        MessagingService.resendMessage(message).then(() => {
          sinon.assert.calledWith(
            Settings.getServiceIdByIccId,
            message.iccId
          );

          sinon.assert.calledWith(
            clientStub.method,
            'send',
            sinon.match.any, sinon.match.any, {
              serviceId: serviceId
            }
          );
        }).then(done, done);
      });

      test('deletes old message on service promise resolve', function(done) {
        clientStub.method
          .withArgs('send').returns(Promise.resolve(successResult));
        MessagingService.resendMessage(message).then(() => {
          sinon.assert.calledWith(
            clientStub.method,
            'delete',
            message.id
          );
        }).then(done, done);
      });

      test('deletes old message on service promise reject', function(done) {
        clientStub.method
          .withArgs('send').returns(Promise.reject(errorResult));
        MessagingService.resendMessage(message).catch((error) => {
          sinon.assert.calledWith(
            clientStub.method,
            'delete',
            message.id
          );

          assert.equal(error, errorResult);
        }).then(done, done);
      });
    });

    suite('MMS message', function() {
      var message;
      setup(function() {
        message = MockMessages.mms({
          iccId: 100
        });
      });

      test('uses message iccId to retrieve service Id in case of multiple SIMs',
      function(done) {
        var serviceId = 3;

        clientStub.method
          .withArgs('sendMMS').returns(Promise.resolve(successResult));
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(serviceId);

        MessagingService.resendMessage(message).then((result) => {
          sinon.assert.calledWith(
            Settings.getServiceIdByIccId,
            message.iccId
          );

          sinon.assert.calledWith(
            clientStub.method,
            'sendMMS',{
              receivers: message.receivers,
              subject: message.subject,
              smil: message.smil,
              attachments: message.attachments
            }, {
              serviceId: serviceId
            }
          );

          assert.equal(result, successResult);
        }).then(done, done);
      });

      test('deletes old message on success and calls callback', function(done) {
        clientStub.method
          .withArgs('sendMMS').returns(Promise.resolve(successResult));
        MessagingService.resendMessage(message).then(() => {
          sinon.assert.calledWith(
            clientStub.method,
            'delete',
            message.id
          );
        }).then(done, done);
      });

      test('deletes old message on error and calls callback', function(done) {
        clientStub.method
          .withArgs('sendMMS').returns(Promise.reject(errorResult));
        MessagingService.resendMessage(message).catch((error) => {
          sinon.assert.calledWith(
            clientStub.method,
            'delete',
            message.id
          );
          assert.equal(error, errorResult);
        }).then(done, done);
      });
    });
  });

  suite('retrieveMMS', function() {
    var id;

    setup(function() {
      id = 1;
    });

    test('retrieveMMS success', function(done) {
      clientStub.method.returns(Promise.resolve(successResult));
      MessagingService.retrieveMMS(id).then((result) => {
        sinon.assert.calledWith(
          clientStub.method,
          'retrieveMMS',
          id
        );
        assert.equal(result, successResult);
      }).then(done, done);
    });

    test('retrieveMMS error', function(done) {
      clientStub.method.returns(Promise.reject(errorResult));
      MessagingService.retrieveMMS(id).catch((error) => {
        sinon.assert.calledWith(
          clientStub.method,
          'retrieveMMS',
          id
        );
        assert.equal(error, errorResult);
      }).then(done, done);
    });
  });
});
