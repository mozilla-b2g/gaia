'use strict';
/* global MockNavigatorSettings */
requireApp('settings/test/unit/mock_navigator_settings.js');

suite('CallForwarding > ', function() {
  setup(function(done) {
    var modules = [
      'panels/call/call_forwarding',
      'panels/call/call_constant',
      'panels/call/call_utils',
      'panels/call/call_settings_task_scheduler'
    ];

    window.navigator.mozSettings = MockNavigatorSettings;

    testRequire(modules, {},
      (CallForwarding, CallConstant, CallUtils, CallSettingsTaskScheduler) => {
        this.CallForwarding = CallForwarding(0);
        this.CallConstant = CallConstant;
        this.CallUtils = CallUtils;
        this.CallSettingsTaskScheduler = CallSettingsTaskScheduler;
        this.sinon.stub(this.CallForwarding, '_getConn', function() {
          return {
            getCallForwardingOption: function() {
              return Promise.resolve();
            },
            setCallForwardingOption: function() {
              return Promise.resolve();
            }
          };
        });
        done();
    });
  });

  suite('_getOption()', function() {
    test('if the reason is not defined in constnt, just reject',
      function(done) {
        this.CallForwarding._getOption(0, 'fakeOptionName').catch(() => {
          assert.isTrue(true);
        }).then(done, done);
    });

    test('if the reason is defined, just resolve !', function(done) {
      this.CallForwarding._getOption(0, 'fakeOption').then(() => {
        assert.isTrue(true);
      }).then(done, done);
    });
  });

  suite('setCallForwardingValues()', function() {
    test('if there is no key, just reject', function(done) {
      this.CallForwarding.setCallForwardingValues({
        key: '',
        number: '111',
        enabled: true
      }).catch(() => {
        assert.equal(this.CallForwarding._state, 'normal');
        assert.isTrue(true);
      }).then(done, done);
    });

    test('if we already enabled related key, just reject', function(done) {
      this.CallForwarding._cfReasonStates[0] = true;
      this.CallForwarding.setCallForwardingValues({
        key: 'unConditional',
        number: '111',
        enabled: true
      }).catch(() => {
        assert.equal(this.CallForwarding._state, 'normal');
        assert.isTrue(true);
      }).then(done, done);
    });

    test('if enabled, but number is invalid, just reject', function(done) {
      this.sinon.spy(this.CallUtils, 'isPhoneNumberValid');
      this.CallForwarding.setCallForwardingValues({
        key: 'noReply',
        number: 'wrong_number_format_^@!',
        enabled: true
      }).catch((error) => {
        assert.isTrue(this.CallUtils.isPhoneNumberValid.returned(false));
        assert.equal(error.name, 'callForwardingInvalidNumberError');
        assert.equal(this.CallForwarding._state, 'normal');
      }).then(done, done);
    });

    test('if enabled and everything is right, just resolve', function(done) {
      this.CallForwarding.setCallForwardingValues({
        key: 'noReply',
        number: '123456',
        enabled: true
      }).then((result) => {
        assert.equal(this.CallForwarding._state, 'normal');
        assert.equal(result.key, 'noReply');
        assert.equal(result.action,
          this.CallConstant.CALL_FORWARD_ACTION.REGISTRATION);
      }).then(done, done);
    });
  });

  suite('refresh()', function() {
    suite('if success', function() {
      var fakeNumber = '12345678';
      var makeMozSettingsResolve = true;

      setup(function() {
        this.sinon.stub(window.navigator.mozSettings, 'createLock', function() {
          return {
            set: function() {
              if (makeMozSettingsResolve) {
                return Promise.resolve();
              } else {
                return Promise.reject();
              }
            }
          };
        });

        // we will make all cfOptions have this number to make test easier
        this.sinon.stub(this.CallUtils, 'findActiveVoiceRule', function() {
          return {
            number: fakeNumber
          };
        });

        this.sinon.stub(this.CallSettingsTaskScheduler, 'enqueue', function() {
          return Promise.resolve([
            [[], [], [], []]
          ]);
        });
      });

      test('and mozSettigns works well, states will be right', function(done) {
        makeMozSettingsResolve = true;
        this.CallForwarding.refresh().then(() => {
          Object.keys(
            this.CallConstant.CALL_FORWARD_REASON_MAPPING).forEach((key) => {
              assert.equal(this.CallForwarding['_' + key + 'Number'],
                fakeNumber);
              assert.isTrue(this.CallForwarding['_' + key + 'Enabled']);
          });
          assert.equal(this.CallForwarding._state, 'normal');
        }).then(done, done);
      });

      test('but mozSettings is broken, we will reject the request',
        function(done) {
          makeMozSettingsResolve = false;
          this.CallForwarding.refresh().catch(() => {
            assert.equal(this.CallForwarding._state, 'error');
          }).then(done, done);
      });
    });

    suite('if failed', function() {
      setup(function() {
        this.sinon.stub(this.CallSettingsTaskScheduler, 'enqueue', function() {
          return Promise.reject();
        });
      });

      test('we will change to error state', function(done) {
        this.CallForwarding.refresh().then(() => {
          assert.equal(this.CallForwarding._state, 'error');
        }).then(done, done);
      });
    });
  });
});
