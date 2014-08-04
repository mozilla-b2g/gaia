/* global IACManager , MockNavigatormozSetMessageHandler, VivoConfig */
'use strict';

require('/js/utils/debug.js');
require('/js/iac_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/js/config/vivo/config.js');

suite('IAC Manager', function() {
  suite('IAC Manager > Message generator', function() {
    teardown(function() {
      IACManager._reset();
    });

    test('Enabling SilentMode for balance', function() {
      IACManager.init(VivoConfig);
      var serviceType = 'balance';
      var msg = IACManager._generateMsg(serviceType, 'enable');
      assert.equal(msg.type, serviceType);
      assert.equal(msg.action, 'enable');
      assert.isTrue(Array.isArray(msg.smsNumbers));
    });

    test('getSmsNumberList includes all balance numbers', function() {
      IACManager.init(VivoConfig);
      var smsToSilent = IACManager._getSmsNumberList('balance');
      var smsSenders = VivoConfig.balance.senders;

      // Check if all senders are included on the smsToSilent List
      smsSenders.forEach(function (sender) {
        assert.include(smsToSilent, sender);
      });
      // Check if the destination number included on the smsToSilent List
      assert.include(smsToSilent, VivoConfig.balance.destination);

    });

    test('getSmsNumberList includes all topup numbers', function() {
      // Testing when the destination number is not in the sender list
      VivoConfig.topup.destination = 7777;
      IACManager.init(VivoConfig);
      var smsToSilent = IACManager._getSmsNumberList('topup');
      var smsSenders = VivoConfig.topup.senders;

      // Check if all senders are included on the smsToSilent List
      smsSenders.forEach(function (sender) {
        assert.include(smsToSilent, sender);
      });
      // Check if the destination number included on the smsToSilent List
      assert.include(smsToSilent, VivoConfig.topup.destination);
    });
  });

  suite('IAC Manager > broadcastStartOfSMSQuery', function() {
    teardown(function() {
      IACManager._reset();
    });

    test('broadcastStartOfSMSQuery calls _sendBroadcastMessage with the' +
           ' correct arguments', function(done) {
      IACManager.init(VivoConfig);
      var msg = IACManager._generateMsg('balance', 'enable');
      this.sinon.stub(IACManager, '_sendBroadcastMessage', function() {
        sinon.assert.calledWith(IACManager._sendBroadcastMessage, msg);
        done();
      });

      IACManager.broadcastStartOfSMSQuery('balance');
    });
  });

  suite('IAC Manager > broadcastEndOfSMSQuery', function() {
    teardown(function() {
      IACManager._reset();
    });

    test('broadcastStartOfSMSQuery calls _sendBroadcastMessage with the' +
           ' correct arguments', function(done) {
      IACManager.init(VivoConfig);
      var msg = IACManager._generateMsg('topup', 'disable');
      this.sinon.stub(IACManager, '_sendBroadcastMessage', function() {
        sinon.assert.calledWith(IACManager._sendBroadcastMessage, msg);
        done();
      });

      IACManager.broadcastEndOfSMSQuery('topup');
    });
  });

  suite('IAC Manager > Broadcasting messages ', function() {
    var realMozSetMessageHandler,
        realMozApps;

    var FakePort = function() {};
    FakePort.prototype.onmessage = function(cb) {
      cb();
    };
    FakePort.prototype.postMessage = function(e) {
      this.onmessage();
    };

    suiteSetup(function() {
      realMozSetMessageHandler = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
      MockNavigatormozSetMessageHandler.mSetup();

      realMozApps = navigator.mozApps;
    });

    function setupMozAppBehaviour(willFail) {
      var app = {
        connect: function() {
          return this;
        },
        then: function(onConnection, onRejection) {
          if (!willFail) {
            var fakePort = new FakePort();
            (typeof onConnection === 'function') && onConnection([fakePort]);
          } else {
            (typeof onRejection === 'function') && onRejection('error');
          }
        }
      };

      navigator.mozApps =  {
        getSelf: function() {
          return {
            set onsuccess(callback) {
              callback({
                target: {
                  result: app
                }
              });
            }
          };
        }
      };
    }

    suiteTeardown(function() {
      navigator.mozSetMessageHandler = realMozSetMessageHandler;
      MockNavigatormozSetMessageHandler.mTeardown();

      navigator.mozApps = realMozApps;
    });

    test('_sendBroadcastMessage > send the message correctly', function(done) {
      IACManager.init(VivoConfig);
      this.sinon.spy(window, 'clearTimeout');
      setupMozAppBehaviour(false);
      var msg = IACManager._generateMsg('balance', 'enable');

      IACManager._sendBroadcastMessage(msg)
        .then(function() {
          sinon.assert.called(window.clearTimeout);
          done();
        }, function() {
          assert.ok(false);
          done();
        });
    });

    test('_sendBroadcastMessage > can not connect', function(done) {
      IACManager.init(VivoConfig);
      setupMozAppBehaviour(true);
      var msg = IACManager._generateMsg('balance', 'enable');

      IACManager._sendBroadcastMessage(msg)
        .then(function() {
            assert.ok(false);
            done();
          },function() {
            done();
          });
    });

    test('_sendBroadcastMessage > fails by timeout', function(done) {
      IACManager.init(VivoConfig);
      this.sinon.stub(FakePort.prototype, 'onmessage', function(){});
      this.sinon.stub(window, 'setTimeout', function (callback) {
        callback();
      });
      setupMozAppBehaviour(false);
      var msg = IACManager._generateMsg('balance', 'enable');

      IACManager._sendBroadcastMessage(msg)
        .then(function() {
            assert.ok(false);
            done();
          },function() {
            sinon.assert.calledOnce(window.setTimeout);
            done();
          });
    });


  });
});
