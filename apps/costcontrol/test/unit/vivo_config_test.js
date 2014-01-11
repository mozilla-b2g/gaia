'use strict';

requireApp('costcontrol/shared/js/format.js');
requireApp('costcontrol/test/unit/mock_date.js');
requireApp('costcontrol/js/config/vivo/config.js');

suite('Custom VIVO configuration Test Suite >', function() {
  var VIVO_RESERVED_CHARACTER = '0';
  var VIVO_MAX_MESSAGE_LENGTH = 138;
  var VIVO_OPERATION_CHECK_BALANCE = '0102';
  var realDate;

  suiteSetup(function() {
    realDate = window.Date;
    window.Date = new MockDateFactory(new Date('2013-01-01T00:00:00.000Z'));
  });

  suiteTeardown(function() {
    window.Date = realDate;
  });

  function VivoRequestParser(message) {
    return {
      get padding() {
        return message.slice(0, 32);
      },
      get system() {
        return message.slice(32, 35);
      },
      get date() {
        return message.slice(35, 43);
      },
      get time() {
        return message.slice(43, 49);
      },
      get operationType() {
        return message.slice(49, 51);
      },
      get totalMessages() {
        return message.slice(51, 52);
      },
      get currentMessageNumber() {
        return message.slice(52, 53);
      },
      get reserved() {
        return message.slice(53, 54);
      },
      get operation() {
        return message.slice(54, 58);
      },
      get parameters() {
        return message.slice(58);
      }
    };
  }

  function assertIsDate(dateString) {
    var now = new Date();
    var year = parseInt(dateString.slice(0, 4), 10);
    var month = parseInt(dateString.slice(4, 6), 10);
    var day = parseInt(dateString.slice(6, 8), 10);
    assert.isTrue(0 < year && year <= now.getUTCFullYear());
    assert.isTrue(0 < month && month <= 12);
    assert.isTrue(0 < day && day <= 31);
  }

  function assertIsTime(timeString) {
    var hour = parseInt(timeString.slice(0, 2), 10);
    var minutes = parseInt(timeString.slice(2, 4), 10);
    var seconds = parseInt(timeString.slice(4, 6), 10);
    assert.isTrue(0 <= hour && hour <= 23);
    assert.isTrue(0 <= minutes && minutes <= 59);
    assert.isTrue(0 <= seconds && seconds <= 59);
  }

  test('Balance requests have the proper length', function() {
    var VIVO_BALANCE_REQUEST_LENGTH = 58;

    var messageBody = VivoConfig.balance.text;
    assert.isTrue(messageBody.length <= VIVO_MAX_MESSAGE_LENGTH);
    assert.equal(messageBody.length, VIVO_BALANCE_REQUEST_LENGTH);
  });

  test('Balance request matches the proper pattern', function() {
    var messageBody = new VivoRequestParser(VivoConfig.balance.text);
    assert.match(messageBody.padding, /[0]{32}/);
    assert.equal(messageBody.system, 'OWD');
    assertIsDate(messageBody.date);
    assertIsTime(messageBody.time);
    assert.match(messageBody.operationType, /[0-9]{2}/);
    assert.equal(messageBody.totalMessages, '1');
    assert.equal(messageBody.currentMessageNumber, '1');
    assert.equal(messageBody.reserved, VIVO_RESERVED_CHARACTER);
    assert.equal(messageBody.operation, VIVO_OPERATION_CHECK_BALANCE);
    assert.equal(messageBody.parameters.length, 0);
  });

});
