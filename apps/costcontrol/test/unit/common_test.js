/* global MockAllNetworkInterfaces, Common, MockMozNetworkStats, ConfigManager,
          WifiInterfaceType, SimManager, MobileInterfaceType, setNextReset,
          Toolkit */

'use strict';

require('/test/unit/mock_debug.js');
require('/js/common.js');
require('/js/sim_manager.js');
require('/js/config/config_manager.js');
require('/test/unit/mock_moz_l10n.js');
require('/test/unit/mock_moz_network_stats.js');
require('/js/utils/toolkit.js');

var realMozL10n,
    realMozNetworkStats;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

suite('Cost Control Common >', function() {

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozNetworkStats = realMozNetworkStats;
  });

  function getCustomClearStats(willFail) {
    return function() {
      var request = {};
      setTimeout(function() {
        if (willFail) {
          request.error = { name: 'error' };
          request.onerror && request.onerror();
        } else {
          request.result = {};
          request.onsuccess && request.onsuccess();
        }
      }, 0);
      return request;
    };
  }

  function getSuccessfullClearStats() {
    return getCustomClearStats(false);
  }

  function getFailingClearStats() {
    return getCustomClearStats(true);
  }

  test('loadNetworkInterfaces correctly', function(done) {
    Common.loadNetworkInterfaces(
      function() {
        assert.isTrue(Common.allNetworkInterfaceLoaded);
        assert.equal(Common.allNetworkInterfaces.length,
                     MockAllNetworkInterfaces.length);
        assert.equal(Common.allNetworkInterfaces[0].type, WifiInterfaceType);
        assert.equal(Common.allNetworkInterfaces[1].type, MobileInterfaceType);
        assert.equal(Common.allNetworkInterfaces[1].id,
                      MockAllNetworkInterfaces[1].id);
        done();
      }
    );
  });

  suite('Reset Data>', function() {
    suiteSetup(function() {
      sinon.stub(SimManager, 'requestDataSimIcc', function(callback) {
        (typeof callback === 'function') &&
          callback({iccId: Common.allNetworkInterfaces[1].id});
      });
      sinon.stub(ConfigManager, 'setOption', function() {});
      sinon.stub(ConfigManager, 'requestSettings', function() {});
    });
    suiteTeardown(function() {
      SimManager.requestDataSimIcc.restore();
      ConfigManager.setOption.restore();
      ConfigManager.requestSettings.restore();
    });

    test('resetData() wifi interface', function(done) {
      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());
      Common.loadNetworkInterfaces(function() {
        Common.resetData('wifi', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[0]));
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() mobile interface', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('mobile', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[1]));
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() all interfaces', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('all', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledTwice);
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() wifi interface fails', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('wifi', function() {}, function _onError() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() all interfaces fail', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      var testOk = function() {
        if (MockMozNetworkStats.clearStats.calledTwice) {
          MockMozNetworkStats.clearStats.restore();
          done();
        }
      };

      Common.loadNetworkInterfaces(function() {
        Common.resetData('all', function() {
          setTimeout(testOk, 500);
        });
      });
    });
  });

  suite('localizeWeekdaySelector>', function() {
    var domForTesting, l10nStub;

    setup(function() {
      domForTesting = document.createElement('div');
      domForTesting.innerHTML = '<select id="select-weekday">' +
        '<option class="monday" value="1">Monday</option>' +
        '<option value="2" >Tuesday</option>' +
        '<option value="3">Wednesday</option>' +
        '<option value="4">Thursday</option>' +
        '<option value="5">Friday</option>' +
        '<option value="6">Saturday</option>' +
        '<option class="sunday" value="0">Sunday</option>' +
        '</select>';
      document.body.appendChild(domForTesting);
      l10nStub = this.sinon.stub(navigator.mozL10n, 'get');
    });

    suiteTeardown(function() {
      domForTesting.parentNode.removeChild(domForTesting);
    });

    test('localizeWeekdaySelector - week starts on sunday', function() {
      l10nStub.withArgs('weekStartsOnMonday').returns('0');
      Common.localizeWeekdaySelector(domForTesting);
      var monday = domForTesting.querySelector('.monday');
      var weekdayList = monday.parentNode;
      assert.isTrue(weekdayList.childNodes[0].classList.contains('sunday'));
    });

    test('localizeWeekdaySelector - week starts on monday', function() {
      l10nStub.withArgs('weekStartsOnMonday').returns('1');
      Common.localizeWeekdaySelector(domForTesting);
      var monday = domForTesting.querySelector('.monday');
      var weekdayList = monday.parentNode;
      assert.isTrue(weekdayList.childNodes[0].classList.contains('monday'));
    });
  });

  suite('closeFTE>', function() {
    var fteFrame;
    setup(function() {
      fteFrame = document.createElement('iframe');
      fteFrame.id = 'fte_view';
      window.parent.document.body.appendChild(fteFrame);
    });

    suiteTeardown(function() {
      fteFrame.parentNode.removeChild(fteFrame);
    });

    test('FTE iframe is hidden after call closeFTE method', function() {
      assert.isFalse(fteFrame.classList.contains('non-ready'));
      Common.closeFTE();
      assert.isTrue(fteFrame.classList.contains('non-ready'));
    });
  });

  suite('updated nextReset>', function() {
    setup(function() {
      this.sinon.stub(window, 'setNextReset');
    });

    suiteTeardown(function() {
    });

    test('tracking period is never', function() {
      Common.updateNextReset('never', 0, 'trakingPeriodNever');
      sinon.assert.called(setNextReset);
      sinon.assert.calledWith(setNextReset, null, 'trakingPeriodNever');
    });

    test('nextReset is updated to the next 3th when the monthly tracking ' +
         'period is selected', function() {
      var monthday = 3;
      var today = new Date();
      var month = today.getMonth();
      var year = today.getFullYear();
      if (today.getDate() >= monthday) {
        month = (month + 1) % 12;
        if (month === 0) {
          year++;
        }
      }
      var nextReset = new Date(year, month, monthday);

      Common.updateNextReset('monthly', monthday, 'trackingPeriodMonthly');
      // Check the method setNextReset is called with the correct parameters:
      // the next day of the month since today.
      sinon.assert.called(setNextReset);
      sinon.assert.calledWith(setNextReset, nextReset, 'trackingPeriodMonthly');
    });

    test('nextReset is updated to the next third day of the next week when ' +
           'the weekly tracking period is selected', function() {
      var today = new Date();
      var oneDay = 24 * 60 * 60 * 1000;
      var weekday = 3;
      var daysToTarget = weekday - today.getDay();
      if (daysToTarget <= 0) {
        daysToTarget = 7 + daysToTarget;
      }
      var nextReset = new Date();
      nextReset.setTime(nextReset.getTime() + oneDay * daysToTarget);
      Toolkit.toMidnight(nextReset);

      Common.updateNextReset('weekly', weekday, 'trackingPeriodWeekly');
      // Check the method setNextReset is called with the correct parameters:
      // the next weekday since today.
      sinon.assert.called(setNextReset);
      sinon.assert.calledWith(setNextReset, nextReset, 'trackingPeriodWeekly');
    });
  });

  suite('getDataLimit>', function() {
    test('getDataLimit', function() {
      var settings = {
        dataLimitUnit : 'MB',
        dataLimitValue : 7
      };
      assert.equal(Common.getDataLimit(settings), 7000000);

      settings.dataLimitUnit = 'GB';
      assert.equal(Common.getDataLimit(settings), 7000000000);

    });
  });

  suite('Reset All>', function() {
    test('reset All works ok when call to resetData', function() {
      this.sinon.stub(Common, 'resetData', function (mode, onSuccess, onError) {
        onSuccess();
      });
      this.sinon.stub(window, 'resetTelephony', function() {});
      Common.resetAll();
      sinon.assert.called(window.resetTelephony);
    });

    test('reset All fails when call to resetData', function() {
      // If reset Data fails, then abort completely the process. Do not try to
      // call resetTelephony method
      this.sinon.stub(Common, 'resetData', function (mode, onSuccess, onError) {
        onError();
      });
      this.sinon.stub(window, 'resetTelephony', function() {});
      Common.resetAll();
      sinon.assert.notCalled(window.resetTelephony);
    });
  });
});
