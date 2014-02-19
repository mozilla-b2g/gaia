/* globals SimPicker, MocksHelper, MockMozL10n, MockMozMobileConnection */

'use strict';

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_l10n.js');
require('/dialer/test/unit/mock_mozMobileConnection.js');

require('/shared/js/sim_picker.js');

var mocksHelperForSimPicker = new MocksHelper([
  'LazyLoader',
  'LazyL10n',
  'MozMobileConnection'
]).init();

suite('SIM picker', function() {
  var subject;
  var realMozMobileConnections;
  var realMozL10n;
  var menu;

  mocksHelperForSimPicker.attachTestHelpers();

  var loadBody = function() {
    loadBodyHTML('/dialer/elements/sim-picker.html');
    document.body.innerHTML = document.body.querySelector('template').innerHTML;
  };

  suiteSetup(function() {
    subject = SimPicker;

    loadBody();

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [];

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    navigator.mozL10n.localize = function() {};

    menu = document.querySelector('menu');
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    navigator.mozMobileConnections =
      [this.sinon.stub(), MockMozMobileConnection];

    subject.show(0, '1111', function() {});
  });

  suite('show', function() {
    test('header should contain phone number', function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
      subject.show(0, '1111', function() {});
      sinon.assert.calledWith(localizeSpy,
                              document.getElementById('sim-picker-dial-via'),
                              'sim-picker-dial-via',
                              {phoneNumber: '1111'});
    });

    test('showing the menu twice with different args', function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');

      subject.show(0, '1111', function() {});
      sinon.assert.calledWith(localizeSpy,
                              document.getElementById('sim-picker-dial-via'),
                              'sim-picker-dial-via',
                              {phoneNumber: '1111'});
      assert.equal(menu.children.length, 3);

      subject.show(0, '2222', function() {});
      sinon.assert.calledWith(localizeSpy,
                              document.getElementById('sim-picker-dial-via'),
                              'sim-picker-dial-via',
                              {phoneNumber: '2222'});
      assert.equal(menu.children.length, 3);
    });

    test('should show the menu', function() {
      assert.equal(document.getElementById('sim-picker').hidden, false);
    });
  });

  suite('buttons', function() {
    test('should have 2 option buttons', function() {
      var buttonNum = 0;
      for (var i = 0; i < menu.children.length; i++) {
        if (menu.children[i].textContent !== 'Cancel') {
          buttonNum++;
        }
      }
      assert.equal(buttonNum, 2);
    });

    test('should have 3 buttons in total', function() {
      assert.equal(menu.children.length, 3);
    });

    test('should mark default SIM', function() {
      for (var i = 0; i < menu.children.length; i++) {
        assert.equal(
          menu.children[i].classList.contains('is-default'), i === 0);
      }
    });

    test('should not mark default SIM when none is set', function() {
      subject.show(undefined, '2222', function() {});
      for (var i = 0; i < menu.children.length; i++) {
        assert.isFalse(menu.children[i].classList.contains('is-default'));
      }
    });
  });

  suite('callbacks and functions', function() {
    setup(function() {
      loadBody();
    });

    test('should fire callback when a SIM is selected', function() {
      var callbackStub = this.sinon.stub();
      subject.show(0, '1111', callbackStub);

      menu.children[0].click();

      sinon.assert.calledOnce(callbackStub);
      assert.equal(document.getElementById('sim-picker').hidden, true);
    });

    test('should close menu when pressing cancel button', function() {
      var callbackStub = this.sinon.stub();
      subject.show(0, '1111', callbackStub);

      menu.children[2].click();

      sinon.assert.notCalled(callbackStub);
      assert.equal(document.getElementById('sim-picker').hidden, true);
    });
  });
});
