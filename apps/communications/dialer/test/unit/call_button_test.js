/* globals CallButton, MockSimPicker, MockSimSettingsHelper, MocksHelper,
           MockMozL10n, MockMozMobileConnection, SimSettingsHelper
*/

'use strict';

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_l10n.js');
require('/dialer/test/unit/mock_mozMobileConnection.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');

require('/dialer/js/call_button.js');

var mocksHelperForCallButton = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'SimSettingsHelper',
  'SimPicker'
]).init();

suite('call button', function() {
  var subject;
  var realMozMobileConnections;
  var realMozL10n;
  var phoneNumber;
  var button;

  mocksHelperForCallButton.attachTestHelpers();

  var simulateClick = function() {
    var ev = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    button.dispatchEvent(ev);
  };

  var simulateContextMenu = function() {
    var ev = document.createEvent('MouseEvents');
    ev.initMouseEvent('contextmenu', true, false, window, 0, 0, 0, 0, 0,
                      false, false, false, false, 2, null);
    button.dispatchEvent(ev);
  };

  var phoneNumberGetter = function() {
    return phoneNumber;
  };

  suiteSetup(function() {
    subject = CallButton;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [];

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    navigator.mozL10n.localize = function() {};
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    phoneNumber = '';
    navigator.mozMobileConnections =
      [this.sinon.stub(), MockMozMobileConnection];
    button = document.createElement('button');
    subject.init(button, phoneNumberGetter);
  });

  suite('<= 1 SIMs', function() {
    setup(function() {
      navigator.mozMobileConnections = [MockMozMobileConnection];
      subject.init(button, phoneNumberGetter);
    });

    test('should not show SIM picker menu when long pressing', function() {
      phoneNumber = '15555555555';
      var showSpy = this.sinon.spy(MockSimPicker, 'show');
      simulateContextMenu();
      sinon.assert.notCalled(showSpy);
    });
  });

  suite('>= 2 SIMs', function() {
    suite('SIM 2 preferred', function() {
      setup(function() {
        MockSimSettingsHelper._defaultCards.outgoingCall = 1;
        subject.init(button, phoneNumberGetter);
      });

      test('should show SIM picker menu when long pressing', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        simulateContextMenu();
        sinon.assert.calledWith(showSpy, 1, phoneNumber);
      });

      test('should fire SIM selected callback', function() {
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        subject.init(button, phoneNumberGetter, showSpy);

        phoneNumber = '15555555555';
        simulateContextMenu();
        subject.makeCall(1);
        sinon.assert.calledWith(showSpy, 1, phoneNumber);
      });

      test('should check the connection on the primary SIM card', function() {
        var callStub = this.sinon.stub();
        subject.init(button, phoneNumberGetter, callStub);

        phoneNumber = '0145345520';
        subject.makeCall();
        sinon.assert.calledWith(callStub, phoneNumber, 1);
      });
    });

    suite('always ask', function() {
      setup(function() {
        MockSimSettingsHelper._defaultCards.outgoingCall =
          SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
      });

      test('should show SIM picker when clicked', function() {
        phoneNumber = '15555555555';
        var showSpy = this.sinon.spy(MockSimPicker, 'show');
        simulateClick();
        sinon.assert.calledWith(
          showSpy, SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE,
          phoneNumber);
      });
    });
  });
});
