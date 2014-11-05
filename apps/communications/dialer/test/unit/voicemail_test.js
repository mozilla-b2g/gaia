/* global MockMozVoicemail, MockNavigatorSettings, Voicemail */
'use strict';

require('/shared/js/dialer/voicemail.js');
require('/dialer/test/unit/mock_mozVoicemail.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('dialer/voicemail', function() {
  var realMozVoicemail;
  var realMozSettings;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
  });

  var VOICEMAIL_NUMBER_SIM_1 = '123';
  var VOICEMAIL_NUMBER_SIM_2 = '777';
  var NON_VOICEMAIL_NUMBER = '1234567890';
  // We have two sources of voicemail number: mozVoicemailNumber and
  // 'ril.iccInfo.mbdn' in mozSettings. Since we support dual SIM now,
  // each of them could have 0, 1, or 2 voicemail numbers. All the
  // combinations of voicemail number sources are covered in array 'scenarios'.
  var scenarios = [
    {
      name: 'mozVoicemail has voicemail number of SIM 1',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      mozSettingsVoicemailNumber: null,
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 2',
      mozVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: null,
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozSettings has voicemail number of SIM 1',
      mozVoicemailNumber: null,
      mozSettingsVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      }
    },
    {
      name: 'mozSettings has voicemail number of SIM 2',
      mozVoicemailNumber: null,
      mozSettingsVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 1 and SIM 2',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: null,
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail and mozSettings have voicemail number of SIM 1',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      mozSettingsVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 1 and ' +
        'mozSettings has voicemail number of SIM 2',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      mozSettingsVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 2 and ' +
        'mozSettings has voicemail number of SIM 1',
      mozVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail and mozSettings have voicemail number of SIM card 2',
      mozVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozSettings has both voicemail number of SIM 1 and SIM 2',
      mozVoicemailNumber: null,
      mozSettingsVoicemailNumber: [
        VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2
      ],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 1 and SIM 2 and ' +
        'mozSettings has voicemail number of SIM 1',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 1 and SIM 2 and ' +
        'mozSettings has voicemail number of SIM 2',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 1 and ' +
        'mozSettings has voicemail number of SIM 1 and SIM 2',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1],
      mozSettingsVoicemailNumber: [
        VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2
      ],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail has voicemail number of SIM 2 and ' +
        'mozSettings has voicemail number of SIM 1 and SIM 2',
      mozVoicemailNumber: [undefined, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [
        VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2
      ],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    },
    {
      name: 'mozVoicemail and mozSettings have voicemail number of ' +
        'SIM 1 and SIM 2',
      mozVoicemailNumber: [VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2],
      mozSettingsVoicemailNumber: [
        VOICEMAIL_NUMBER_SIM_1, VOICEMAIL_NUMBER_SIM_2
      ],
      assertionWhenCallingVoicemailNumber: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      },
      assertionWhenCallingVoicemailNumber2: function(isVoicemailNumber) {
        assert.isTrue(isVoicemailNumber);
      }
    }
  ];

  scenarios.forEach(function(scenario) {
    suite(scenario.name, function() {
      setup(function() {
        this.sinon.stub(
          navigator.mozVoicemail, 'getNumber', function(cardId) {
            return scenario.mozVoicemailNumber &&
              scenario.mozVoicemailNumber[cardId];
          });

        MockNavigatorSettings.createLock().set({
          'ril.iccInfo.mbdn': scenario.mozSettingsVoicemailNumber
        });
      });

      test('call the voicemail number via SIM 1', function(done) {
        var serviceId = 0;
        Voicemail.check(VOICEMAIL_NUMBER_SIM_1, serviceId).then(
        function(isVoicemailNumber) {
          scenario.assertionWhenCallingVoicemailNumber(isVoicemailNumber);
        }, function(reason) {
          assert.fail('should not reject promise: ' + reason);
        }).then(done, done);
      });

      test('call the voicemail number via SIM 2', function(done) {
        var serviceId = 1; // serviceId 1 means SIM 2
        Voicemail.check(VOICEMAIL_NUMBER_SIM_2, serviceId).then(
        function(isVoicemailNumber) {
          scenario.assertionWhenCallingVoicemailNumber2(isVoicemailNumber);
        }, function(reason) {
          assert.fail('should not reject promise: ' + reason);
        }).then(done, done);
      });

      test('call a number is not the voicemail number', function(done) {
        var serviceId = 0;
        Voicemail.check(NON_VOICEMAIL_NUMBER, serviceId).then(
        function(isVoicemailNumber) {
          assert.isFalse(isVoicemailNumber);
        }, function(reason) {
          assert.fail('should not reject promise: ' + reason);
        }).then(done, done);
      });

      test('call a number that is not the voicemail number of SIM 2 ' +
        'via SIM 2', function(done) {
        var serviceId = 1;
        Voicemail.check(NON_VOICEMAIL_NUMBER, serviceId).then(
        function(isVoicemailNumber) {
          assert.isFalse(isVoicemailNumber);
        }, function(reason) {
          assert.fail('should not reject promise: ' + reason);
        }).then(done, done);
      });
    });
  });

  test('Blank number is not voicemail', function(done) {
    this.sinon.stub(navigator.mozVoicemail, 'getNumber').returns('');
    MockNavigatorSettings.createLock().set({'ril.iccInfo.mbdn': ''});

    Voicemail.check('', 0).then(
    function(isVoicemailNumber) {
      assert.isFalse(isVoicemailNumber);
    }, function(reason) {
      assert.fail('should not reject promise: ' + reason);
    }).then(done, done);
  });
});
