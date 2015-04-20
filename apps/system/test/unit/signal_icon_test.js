/* global SignalIcon, MocksHelper, MockService,
          MockL10n, MockSIMSlot, MockNavigatorMozMobileConnection */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/signal_icon.js');
requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForSignalIcon = new MocksHelper([
  'Service'
]).init();

suite('system/SignalIcon', function() {
  var subject;
  var realL10n;
  var dataset;

  mocksForSignalIcon.attachTestHelpers();

  setup(function() {
    MockService.mActiveCall = false;
    MockService.mConnectionType = '';
    MockService.mCDMA = false;
    MockService.mInCall = false;
    MockService.mRadioEnabled = true;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.stub(document, 'getElementById', function() {
      var ele = document.createElement('div');
      this.sinon.stub(ele, 'querySelector')
          .returns(document.createElement('div'));
      return ele;
    }.bind(this));
    subject = new SignalIcon(
      new MockSIMSlot(MockNavigatorMozMobileConnection, 0), 0);
    subject.start();
    subject.element = document.createElement('div');
    subject.dataText = document.createElement('div');
    subject.manager.conn.voice = {
      connected: false,
      roaming: false
    };
    subject.manager.conn.data = {
      connected: false,
      roaming: false
    };
    dataset = subject.element.dataset;
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  suite('Iconchanged', function() {
    suite('data', function() {
      test('Should publish iconchanged from connecting to connected',
        function() {
          subject.update();
          subject.manager.conn.data = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 80
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isTrue(subject.publish.calledWith('changed'));
        });

      test('Should publish iconchanged if strength change over 1 level',
        function() {
          subject.manager.conn.data = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 60
          };
          subject.update();
          subject.manager.conn.data = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 100
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isTrue(subject.publish.calledWith('changed'));
        });

      test('Should not publish iconchanged if strength change within 1 level',
        function() {
          subject.manager.conn.data = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 70
          };
          subject.update();
          subject.manager.conn.data = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 71
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isFalse(subject.publish.calledWith('changed'));
        });
    });

    suite('voice', function() {
      test('Should publish iconchanged from connecting to connected',
        function() {
          subject.update();
          subject.manager.conn.voice = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 80
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isTrue(subject.publish.calledWith('changed'));
        });

      test('Should publish iconchanged if strength change over 1 level',
        function() {
          subject.manager.conn.voice = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 60
          };
          subject.update();
          subject.manager.conn.voice = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 100
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isTrue(subject.publish.calledWith('changed'));
        });

      test('Should not publish iconchanged if strength change within 1 level',
        function() {
          subject.manager.conn.voice = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 70
          };
          subject.update();
          subject.manager.conn.voice = {
            connected: true,
            roaming: false,
            type: 'evdo',
            relSignalStrength: 71
          };
          this.sinon.stub(subject, 'publish');
          subject.update();
          assert.isFalse(subject.publish.calledWith('changed'));
        });
    });
  });

  suite('update', function() {
    test('SIM card is absent', function() {
      MockService.mRadioEnabled = true;
      this.sinon.stub(subject, 'hide');
      this.sinon.stub(subject.manager, 'isAbsent').returns(true);
      subject.update();
      assert.equal(dataset.inactive, 'true');
      assert.isTrue(subject.hide.called);
      assert.isUndefined(dataset.level);
      assert.isUndefined(dataset.searching);
    });

    test('SIM card is locked', function() {
      MockService.mRadioEnabled = true;
      this.sinon.stub(subject, 'hide');
      this.sinon.stub(subject.manager, 'isLocked').returns(true);
      subject.update();
      assert.isTrue(subject.hide.called);
    });

    test('Radio is disabled', function() {
      MockService.mRadioEnabled = false;
      this.sinon.stub(subject, 'hide');
      subject.update();
      assert.isTrue(subject.hide.called);
    });

    test('Voice is connected', function() {
      subject.manager.conn.voice = {
        connected: true,
        roaming: false,
        type: 'evdo',
        relSignalStrength: 80
      };
      this.sinon.stub(subject, 'show');
      subject.update();
      assert.isTrue(subject.show.called);
      assert.equal(dataset.level, 4);
    });

    test('Has active call at current sim slot', function() {
      subject.manager.conn.voice = {
        relSignalStrength: 20
      };
      MockService.mActiveCall = true;
      this.sinon.stub(subject, 'show');
      subject.update();
      assert.isTrue(subject.show.called);
      assert.equal(dataset.level, 1);
      assert.isUndefined(dataset.searching);
    });

    test('Data is connected', function() {
      subject.manager.conn.data = {
        connected: true,
        roaming: false,
        type: 'evdo',
        relSignalStrength: 80
      };
      this.sinon.stub(subject, 'show');
      subject.update();
      assert.isTrue(subject.show.called);
      assert.equal(dataset.level, 4);
    });

    test('Emergency call only', function() {
      subject.manager.conn.voice.state = 'searching';
      this.sinon.stub(subject, 'updateSignal');
      this.sinon.stub(subject, 'show');
      subject.update();
      assert.isTrue(subject.updateSignal.called);
      assert.isTrue(subject.show.called);
      assert.equal(dataset.level, -1);
      assert.equal(dataset.searching, 'true');
    });
  });

  suite('Update data text', function() {
    setup(function() {
      MockService.mRadioEnabled = true;
      MockService.mInCall = false;
      MockService.mCDMA = false;
      subject.manager.conn.data = {
        connected: true,
        roaming: false,
        type: 'evdo',
        relSignalStrength: 80
      };
    });

    test('Should hide data text if radio is disabled', function() {
      MockService.mRadioEnabled = false;
      subject.updateDataText();
      assert.equal(subject.dataText.hidden, true);
    });

    test('Should hide data text if data is not connected', function() {
      subject.manager.conn.data = {
        connected: false,
        roaming: false,
        type: 'evdo',
        relSignalStrength: 80
      };
      subject.updateDataText();
      assert.equal(subject.dataText.hidden, true);
    });

    test('update data text', function() {
      MockService.mConnectionType = 'LTE';
      this.sinon.stub(subject, 'publish');
      subject.updateDataText();
      assert.isTrue(subject.publish.calledOnce);
      assert.equal(subject.dataText.textContent, 'LTE');
      assert.isFalse(subject.element.classList.contains('sb-icon-data-circle'));
      assert.equal(subject.dataText.hidden, false);

      subject.updateDataText();
      assert.isTrue(subject.publish.calledOnce);
    });

    test('is CDMA and in a call', function() {
      MockService.mConnectionType = 'LTE';
      MockService.mInCall = true;
      MockService.mCDMA = true;
      this.sinon.stub(subject, 'publish');
      subject.updateDataText();
      assert.isFalse(subject.publish.calledOnce);
      assert.equal(subject.dataText.textContent, '');
      assert.isFalse(subject.element.classList.contains('sb-icon-data-circle'));
      assert.equal(subject.dataText.hidden, false);

      MockService.mInCall = false;
      subject.updateDataText();
      assert.isTrue(subject.publish.calledOnce);
    });

    test('No type', function() {
      MockService.mConnectionType = '';
      MockService.mInCall = true;
      MockService.mCDMA = true;
      subject.updateDataText();
      assert.equal(subject.dataText.textContent, '');
      assert.isTrue(subject.element.classList.contains('sb-icon-data-circle'));
      assert.equal(subject.dataText.hidden, false);
    });
  });

  test('no network without sim, not searching', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: null,
      emergencyCallsOnly: false,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = null;
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(true);

    subject.update();

    assert.isUndefined(dataset.level);
    assert.isUndefined(dataset.searching);
  });

  test('no network without sim, searching', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: null,
      emergencyCallsOnly: false,
      state: 'searching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = null;
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(true);

    subject.update();

    assert.isUndefined(dataset.level);
    assert.isUndefined(dataset.searching);
  });

  test('no network with sim, sim locked', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: null,
      emergencyCallsOnly: false,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = 'pinRequired';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);
    sinon.stub(subject.manager, 'isLocked').returns(true);

    subject.update();

    assert.isFalse(subject.isVisible());
  });

  test('searching', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: null,
      emergencyCallsOnly: false,
      state: 'searching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = 'ready';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);

    subject.update();

    assert.equal(dataset.level, 0);
    assert.isUndefined(dataset.searching);
  });

  test('emergency calls only, no sim', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: 80,
      emergencyCallsOnly: true,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = null;
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(true);

    subject.update();

    assert.isUndefined(dataset.level);
    assert.isUndefined(dataset.searching);
  });

  test('emergency calls only, with sim', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: 80,
      emergencyCallsOnly: true,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = 'pinRequired';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);
    sinon.stub(subject.manager, 'isLocked').returns(true);

    subject.update();

    assert.isFalse(subject.isVisible());
  });

  test('normal carrier', function() {
    subject.manager.conn.voice = {
      connected: true,
      relSignalStrength: 80,
      emergencyCallsOnly: false,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = 'ready';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);

    subject.update();

    assert.equal(dataset.level, 4);
    assert.isUndefined(dataset.searching);
  });

  test('EVDO connection, show data call signal strength', function() {
    subject.manager.conn.voice = {
      connected: false,
      relSignalStrength: 0,
      emergencyCallsOnly: false,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.conn.data = {
      connected: true,
      relSignalStrength: 80,
      type: 'evdo',
      emergencyCallsOnly: false,
      state: 'notSearching',
      roaming: false,
      network: {}
    };

    subject.manager.simCard.cardState = 'ready';
    subject.manager.simCard.iccInfo = {};
    sinon.stub(subject.manager, 'isAbsent').returns(false);

    subject.update();
    assert.equal(dataset.level, 4);
  });

  suite('updateSignal', function() {
    var connInfo = {
      relSignalStrength: 75,
      roaming: true,
      network: {
        shortName: 'name'
      }
    };

    setup(function() {
      delete subject.element.dataset;
    });

    test('should set the data-level attribute', function() {
      subject.updateSignal(connInfo);
      assert.equal(dataset.level, 4);
    });

    test('should remove the searching dataset', function() {
      dataset.searching = true;
      subject.updateSignal(connInfo);
      assert.isUndefined(dataset.searching);
    });

    test('should set l10nId and l10nArgs', function() {
      dataset.searching = true;
      subject.updateSignal(connInfo);
      assert.equal(MockL10n.getAttributes(subject.element).id,
        'statusbarSignalRoaming');
      assert.deepEqual(MockL10n.getAttributes(subject.element).args, {
        level: dataset.level,
        operator: connInfo.network && connInfo.network.shortName
      });
    });
  });
});
