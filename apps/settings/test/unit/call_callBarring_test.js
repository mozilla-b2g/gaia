/* globals loadBodyHTML, CallBarring, InputPasscodeScreen, Toaster,
           MockL10n, MocksHelper, MockMobileconnection
*/

'use strict';

require('/js/utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('settings/test/unit/mock_toaster.js');
requireApp('settings/test/unit/mock_callBarring_passcode.js');
requireApp('settings/js/call_barring.js');

var mocksForCallBarring = new MocksHelper([
  'InputPasscodeScreen',
  'Toaster'
]).init();

suite('Call Barring settings', function() {
  var realMozMobileConnection,
      realL10n,
      htmlDOM;

  var _mobileConnection,
      baocElement,
      boicElement,
      boicExHcElement,
      baicElement,
      baicRElement;

  var _serviceClass;

  mocksForCallBarring.attachTestHelpers();

  function resetHTML() {
    document.body.innerHTML = '';
    loadBodyHTML(htmlDOM);
    baocElement = document.getElementById('li-cb-baoc');
    boicElement = document.getElementById('li-cb-boic');
    boicExHcElement = document.getElementById('li-cb-boic-exhc');
    baicElement = document.getElementById('li-cb-baic');
    baicRElement = document.getElementById('li-cb-baic-r');
  }

  function isItemDisabled(element) {
    // getAttribute returns a 'string', asserts errors if not a boolean
    return element.getAttribute('aria-disabled') === 'true';
  }
  function isItemChecked(element) {
    return element.querySelector('input').checked || false;
  }

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMobileconnection;

    htmlDOM = './_call_cb_settings.html';
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
    navigator.mozMobileConnection = realMozMobileConnection;
  });

  setup(function() {
    _mobileConnection = navigator.mozMobileConnection();
    _serviceClass = _mobileConnection.ICC_SERVICE_CLASS_VOICE;
  });

  suite('> GET data', function() {

    var _cbServiceMapper = {
      'li-cb-baoc': 0,
      'li-cb-boic': 1,
      'li-cb-boic-exhc': 2,
      'li-cb-baic': 3,
      'li-cb-baic-r': 4
    };

    var serviceOn = {
      set onsuccess(cb) {
        this.result = {
          'enabled': true
        };
        cb.call(this);
      }
    };
    var serviceOff = {
      set onsuccess(cb) {
        this.result = {
          'enabled': false
        };
        cb.call(this);
      }
    };

    setup(function() {
      resetHTML();

      _mobileConnection.getCallBarringOption = sinon.stub();
      CallBarring.init({
        'mobileConnection': _mobileConnection,
        'voiceServiceClassMask': _serviceClass
      });
    });

    teardown(function() {
      _mobileConnection.getCallBarringOption = null;
      document.body.innerHTML = '';
    });

    test('> When ALL services are OFF', function(done) {
      _mobileConnection.getCallBarringOption.returns(serviceOff);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isFalse(isItemChecked(boicElement),
          'boic should not be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isFalse(isItemChecked(boicExHcElement),
          'boicExHc should not be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BAOC is ON and the rest are OFF', function(done) {
      var baoc = {
        'program': _cbServiceMapper['li-cb-baoc'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.withArgs(baoc).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isTrue(isItemChecked(baocElement),
          'baoc should be checked');

        assert.isTrue(isItemDisabled(boicElement),
          'boic should be disabled');
        assert.isFalse(isItemChecked(boicElement),
          'boic should not be checked');

        assert.isTrue(isItemDisabled(boicExHcElement),
          'boicExHc should be disabled');
        assert.isFalse(isItemChecked(boicExHcElement),
          'boicExHc should not be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BOIC is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isTrue(isItemChecked(boicElement),
          'boic should be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isFalse(isItemChecked(boicExHcElement),
          'boicExHc should not be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BOIC-Ex-Hc is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic-exhc'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isFalse(isItemChecked(boicElement),
          'boic should not be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isTrue(isItemChecked(boicExHcElement),
          'boicExHc should be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BOIC is ON and BOIC-Ex-Hc are ON, and the rest are OFF',
    function(done) {
      var options1 = {
        'program': _cbServiceMapper['li-cb-boic'],
        'serviceClass': _serviceClass
      };
      var options2 = {
        'program': _cbServiceMapper['li-cb-boic-exhc'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options1).returns(serviceOn);
      _mobileConnection.getCallBarringOption.
        withArgs(options2).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isTrue(isItemChecked(boicElement),
          'boic should be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isTrue(isItemChecked(boicExHcElement),
          'boicExHc should be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BAIC is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isFalse(isItemChecked(boicElement),
          'boic should not be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isFalse(isItemChecked(boicExHcElement),
          'boicExHc should not be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isTrue(isItemChecked(baicElement),
          'baic should be checked');

        assert.isTrue(isItemDisabled(baicRElement),
          'baicR should be disabled');
        assert.isFalse(isItemChecked(baicRElement),
          'baicR should not be checked');

        done();
      });
    });

    test('> When BAIC-R is ON and the rest are OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic-r'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isFalse(isItemChecked(baocElement),
          'baoc should not be checked');

        assert.isFalse(isItemDisabled(boicElement),
          'boic should be enabled');
        assert.isFalse(isItemChecked(boicElement),
          'boic should not be checked');

        assert.isFalse(isItemDisabled(boicExHcElement),
          'boicExHc should be enabled');
        assert.isFalse(isItemChecked(boicExHcElement),
          'boicExHc should not be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isFalse(isItemChecked(baicElement),
          'baic should not be checked');

        assert.isFalse(isItemDisabled(baicRElement),
          'baicR should be enabled');
        assert.isTrue(isItemChecked(baicRElement),
          'baicR should be checked');

        done();
      });
    });

    test('> When ALL services are ON', function(done) {

      _mobileConnection.getCallBarringOption.returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement),
          'baoc should be enabled');
        assert.isTrue(isItemChecked(baocElement),
          'baoc should be checked');

        assert.isTrue(isItemDisabled(boicElement),
          'boic should be disabled');
        assert.isTrue(isItemChecked(boicElement),
          'boic should be checked');

        assert.isTrue(isItemDisabled(boicExHcElement),
          'boicExHc should be disabled');
        assert.isTrue(isItemChecked(boicExHcElement),
          'boicExHc should be checked');

        assert.isFalse(isItemDisabled(baicElement),
          'baic should be enabled');
        assert.isTrue(isItemChecked(baicElement),
          'baic should be checked');

        assert.isTrue(isItemDisabled(baicRElement),
          'baicR should be disabled');
        assert.isTrue(isItemChecked(baicRElement),
          'baicR should be checked');

        done();
      });
    });
  });

  suite('> Click on item, cancel password', function () {
    setup(function() {
      resetHTML();

      CallBarring.init({
        'mobileConnection': _mobileConnection,
        'voiceServiceClassMask': _serviceClass
      });

      this.sinon.stub(InputPasscodeScreen, 'show', function() {
        return Promise.reject();
      });
      this.sinon.spy(_mobileConnection, 'setCallBarringOption');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('Barring All Outgoing Calls', function(done) {
      var target = baocElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isFalse(_mobileConnection.setCallBarringOption.called);
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring Outgoing International Calls', function(done) {
      var target = boicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isFalse(_mobileConnection.setCallBarringOption.called);
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring International Calls Except ro Home Country', function(done) {
      var target = boicExHcElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isFalse(_mobileConnection.setCallBarringOption.called);
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring All Incoming Calls', function(done) {
      var target = baicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isFalse(_mobileConnection.setCallBarringOption.called);
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring All Incoming Calls on Roaming', function(done) {
      var target = baicRElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isFalse(_mobileConnection.setCallBarringOption.called);
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
  });

  suite('> Click on item, insert wrong password', function () {
    setup(function() {
      resetHTML();

      CallBarring.init({
        'mobileConnection': _mobileConnection,
        'voiceServiceClassMask': _serviceClass
      });

      this.sinon.stub(InputPasscodeScreen, 'show', function() {
        return Promise.resolve('0000');
      });
      this.sinon.stub(_mobileConnection, 'setCallBarringOption', function() {
        return {
          set onerror(cb) {
            this.error = {
              'name': 'wrong_password',
              'message': ''
            };
            cb.call(this);
          }
        };
      });
      this.sinon.stub(window, 'require', function(array,callback) {
        callback(Toaster);
      });
      this.sinon.spy(Toaster, 'showToast');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('Barring All Outgoing Calls', function(done) {
      var target = baocElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(Toaster.showToast.called, 'should show error');
        assert.isFalse(target.checked, 'should fallback to previous state');
        done();
      });
    });
    test('Barring Outgoing International Calls', function(done) {
      var target = boicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(Toaster.showToast.called, 'should show error');
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring International Calls Except ro Home Country', function(done) {
      var target = boicExHcElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(Toaster.showToast.called, 'should show error');
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring All Incoming Calls', function(done) {
      var target = baicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(Toaster.showToast.called, 'should show error');
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
    test('Barring All Incoming Calls on Roaming', function(done) {
      var target = baicRElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(Toaster.showToast.called, 'should show error');
        assert.isFalse(target.checked, 'fallback to previous state');
        done();
      });
    });
  });

  suite('> Click on item, insert correct password', function () {
    setup(function() {
      resetHTML();

      CallBarring.init({
        'mobileConnection': _mobileConnection,
        'voiceServiceClassMask': _serviceClass
      });

      this.sinon.stub(InputPasscodeScreen, 'show', function() {
        return Promise.resolve('0000');
      });
      this.sinon.stub(_mobileConnection, 'setCallBarringOption', function() {
        return {
          set onsuccess(cb) {
            this.request = {};
            cb.call(this);
          }
        };
      });
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('Barring All Outgoing Calls', function(done) {
      var target = baocElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(target.checked, 'should keep the state');
        done();
      });
    });
    test('Barring Outgoing International Calls', function(done) {
      var target = boicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(target.checked, 'should keep the state');
        done();
      });
    });
    test('Barring International Calls Except ro Home Country', function(done) {
      var target = boicExHcElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(target.checked, 'should keep the state');
        done();
      });
    });
    test('Barring All Incoming Calls', function(done) {
      var target = baicElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(target.checked, 'should keep the state');
        done();
      });
    });
    test('Barring All Incoming Calls on Roaming', function(done) {
      var target = baicRElement.querySelector('input');
      target.click();
      assert.isTrue(target.checked);
      assert.isTrue(InputPasscodeScreen.show.called);
      setTimeout(function() {
        assert.isTrue(_mobileConnection.setCallBarringOption.called);
        assert.isTrue(target.checked, 'should keep the state');
        done();
      });
    });
  });
});
