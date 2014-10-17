/* globals loadBodyHTML, CallBarring, InputPasscodeScreen,
           MockL10n, MocksHelper, MockMobileconnection
*/

'use strict';

require('/js/utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('settings/test/unit/mock_callBarring_passcode.js');
requireApp('settings/js/call_barring.js');

var mocksForCallBarring = new MocksHelper([
  'InputPasscodeScreen',
  'ChangePasscodeScreen'
]).init();

suite('Call Barring settings', function() {
  var realMozMobileConnection,
      realL10n;

  var _mobileConnection,
      baocElement,
      boicElement,
      boicExHcElement,
      baicElement,
      baicRElement;

  var _serviceClass;

  mocksForCallBarring.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMobileconnection;
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

    function isItemDisabled(element) {
      // getAttribute returns a 'string', asserts errors if not a boolean
      return element.getAttribute('aria-disabled') === 'true';
    }
    function isItemChecked(element) {
      return element.querySelector('input').checked || false;
    }

    setup(function() {
      loadBodyHTML('./_call_cb_settings.html');
      baocElement = document.getElementById('li-cb-baoc');
      boicElement = document.getElementById('li-cb-boic');
      boicExHcElement = document.getElementById('li-cb-boic-exhc');
      baicElement = document.getElementById('li-cb-baic');
      baicRElement = document.getElementById('li-cb-baic-r');

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

    test('> All services are OFF', function(done) {
      _mobileConnection.getCallBarringOption.returns(serviceOff);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isFalse(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isFalse(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BAOC is ON, rest is OFF', function(done) {
      var baoc = {
        'program': _cbServiceMapper['li-cb-baoc'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.withArgs(baoc).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isTrue(isItemChecked(baocElement));

        assert.isTrue(isItemDisabled(boicElement));
        assert.isFalse(isItemChecked(boicElement));

        assert.isTrue(isItemDisabled(boicExHcElement));
        assert.isFalse(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BOIC is ON, rest is OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isTrue(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isFalse(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BOIC-Ex-Hc is ON, rest is OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-boic-exhc'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isFalse(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isTrue(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BOIC is ON and BOIC-Ex-Hc are ON, rest is OFF', function(done) {
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
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isTrue(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isTrue(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BAIC is ON, rest is OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isFalse(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isFalse(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isTrue(isItemChecked(baicElement));

        assert.isTrue(isItemDisabled(baicRElement));
        assert.isFalse(isItemChecked(baicRElement));

        done();
      });
    });

    test('> BAIC-R is ON, rest is OFF', function(done) {
      var options = {
        'program': _cbServiceMapper['li-cb-baic-r'],
        'serviceClass': _serviceClass
      };

      _mobileConnection.getCallBarringOption.returns(serviceOff);
      _mobileConnection.getCallBarringOption.
        withArgs(options).returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isFalse(isItemChecked(baocElement));

        assert.isFalse(isItemDisabled(boicElement));
        assert.isFalse(isItemChecked(boicElement));

        assert.isFalse(isItemDisabled(boicExHcElement));
        assert.isFalse(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isFalse(isItemChecked(baicElement));

        assert.isFalse(isItemDisabled(baicRElement));
        assert.isTrue(isItemChecked(baicRElement));

        done();
      });
    });

    test('> All services are ON', function(done) {

      _mobileConnection.getCallBarringOption.returns(serviceOn);

      CallBarring.updateSubpanels(function finished(error) {
        assert.isFalse(isItemDisabled(baocElement));
        assert.isTrue(isItemChecked(baocElement));

        assert.isTrue(isItemDisabled(boicElement));
        assert.isTrue(isItemChecked(boicElement));

        assert.isTrue(isItemDisabled(boicExHcElement));
        assert.isTrue(isItemChecked(boicExHcElement));

        assert.isFalse(isItemDisabled(baicElement));
        assert.isTrue(isItemChecked(baicElement));

        assert.isTrue(isItemDisabled(baicRElement));
        assert.isTrue(isItemChecked(baicRElement));

        done();
      });
    });
  });

  suite('> Click on item triggers Passcode Input panel', function () {

    setup(function() {
      loadBodyHTML('./_call_cb_settings.html');
      baocElement = document.getElementById('li-cb-baoc');
      boicElement = document.getElementById('li-cb-boic');
      boicExHcElement = document.getElementById('li-cb-boic-exhc');
      baicElement = document.getElementById('li-cb-baic');
      baicRElement = document.getElementById('li-cb-baic-r');

      CallBarring.init({
        'mobileConnection': _mobileConnection,
        'voiceServiceClassMask': _serviceClass
      });

      this.sinon.stub(InputPasscodeScreen, 'show', function () {
        return Promise.reject();
      });
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('Barring All Outgoing Calls', function() {
      baocElement.querySelector('input').click();
      assert.isTrue(InputPasscodeScreen.show.called);
    });
    test('Barring Outgoing International Calls', function() {
      boicElement.querySelector('input').click();
      assert.isTrue(InputPasscodeScreen.show.called);
    });
    test('Barring International Calls Except ro Home Country', function() {
      boicExHcElement.querySelector('input').click();
      assert.isTrue(InputPasscodeScreen.show.called);
    });
    test('Barring All Incoming Calls', function() {
      baicElement.querySelector('input').click();
      assert.isTrue(InputPasscodeScreen.show.called);
    });
    test('Barring All Incoming Calls on Roaming', function() {
      baicRElement.querySelector('input').click();
      assert.isTrue(InputPasscodeScreen.show.called);
    });
  });





});
