/* global loadBodyHTML, MockL10n, MockNavigatorMozMobileConnections */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('Call Barring Panel >', function() {
  var modules = [
    'panels/call_barring/panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/call_barring/call_barring': 'MockCallBarring',
      'panels/call_barring/passcode_dialog': 'MockPasscode',
      'shared/toaster': 'MockToaster'
    }
  };

  var realL10n,
      realDsdsSettings,
      realMozMobileConnections;

  var _mobileConnection,
      _serviceClass;

  var baocElement,
      boicElement,
      boicExhcElement,
      baicElement,
      baicRElement;

  suiteSetup(function() {
    realDsdsSettings = window.DsdsSettings;
    window.DsdsSettings = {
      getIccCardIndexForCallSettings: function() {
        return 0;
      }
    };

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    _mobileConnection = MockNavigatorMozMobileConnections[0];
    _serviceClass = _mobileConnection.ICC_SERVICE_CLASS_VOICE;
  });

  suiteTeardown(function() {
    window.DsdsSettings = realDsdsSettings;
    navigator.mozL10n = realL10n;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  function resetHTML() {
    document.body.innerHTML = '';
    loadBodyHTML('_call_barring.html');

    baocElement = document.getElementById('li-cb-baoc');
    boicElement = document.getElementById('li-cb-boic');
    boicExhcElement = document.getElementById('li-cb-boicExhc');
    baicElement = document.getElementById('li-cb-baic');
    baicRElement = document.getElementById('li-cb-baicR');
  }

  function isItemDisabled(element) {
    // getAttribute returns a 'string', asserts errors if not a boolean
    return element.getAttribute('aria-disabled') === 'true';
  }
  function isItemChecked(element) {
    return element.querySelector('input').checked || false;
  }

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          show: options.onShow,
          beforeHide: options.onBeforeHide
        };
      };
    });

    // Define MockCallBarring
    this.mockCallBarring = {
      getAll: function(api) {},
      set: function(api, setting, passcode) {
        return new Promise(function(res, rej) {
          res();
        });
      },
      observe: function() {},
      unobserve: function() {}
    };
    define('MockCallBarring', function() {
      return that.mockCallBarring;
    });

    // Define MockPasscode
    this.mockPasscode = {
      init: function() {},
      show: function() {}
    };
    define('MockPasscode', function() {
      return function() {
        return that.mockPasscode;
      };
    });

    // Define MockToaster
    this.mockToaster = {
      showToast: function() {}
    };
    define('MockToaster', function() {
      return that.mockToaster;
    });

    requireCtx(modules, function(CallBarringPanel) {
      that.panel = CallBarringPanel();
      done();
    });

    resetHTML();
  });

  test('listen to \'panelready\' before showing >', function() {
    this.sinon.stub(window, 'addEventListener');
    this.panel.init(document.body);
    this.panel.beforeShow(document.body);
    assert.isTrue(window.addEventListener.calledWith('panelready'));
  });

  test('reset DOM values before showing >', function() {
    var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];
    // activate all before testing
    targets.forEach(function(element) {
      element.querySelector('input').checked = true;
    });

    this.panel.init(document.body);
    this.panel.beforeShow(document.body);

    targets.forEach(function(element) {
      var input = element.querySelector('input');
      assert.isFalse(input.checked);
    });
  });

  test('observe settings status before showing >', function() {
    this.sinon.stub(this.mockCallBarring, 'observe');
    this.panel.init(document.body);
    this.panel.beforeShow(document.body);
    assert.isTrue(this.mockCallBarring.observe.calledWith('baoc'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('boic'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('boicExhc'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('baic'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('baicR'));
  });

  test('observe settings availability before showing >', function() {
    this.sinon.stub(this.mockCallBarring, 'observe');
    this.panel.init(document.body);
    this.panel.beforeShow(document.body);
    assert.isTrue(this.mockCallBarring.observe.calledWith('baoc_enabled'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('boic_enabled'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('boicExhc_enabled'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('baic_enabled'));
    assert.isTrue(this.mockCallBarring.observe.calledWith('baicR_enabled'));
  });

  test('observe updating status before showing >', function() {
    this.sinon.stub(this.mockCallBarring, 'observe');
    this.panel.init(document.body);
    this.panel.beforeShow(document.body);
    assert.isTrue(this.mockCallBarring.observe.calledWith('updating'));
  });

  test('stop listening to \'panelready\' before hiding >', function() {
    this.sinon.stub(window, 'removeEventListener');
    this.panel.init(document.body);
    this.panel.beforeHide();
    assert.isTrue(window.removeEventListener.calledWith('panelready'));
  });

  test('stop observing settings status before hiding >', function() {
    this.sinon.stub(this.mockCallBarring, 'unobserve');
    this.panel.init(document.body);
    this.panel.beforeHide();
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baoc'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('boic'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('boicExhc'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baic'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baicR'));
  });

  test('stop observing settings availability before hiding >', function() {
    this.sinon.stub(this.mockCallBarring, 'unobserve');
    this.panel.init(document.body);
    this.panel.beforeHide();
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baoc_enabled'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('boic_enabled'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith(
      'boicExhc_enabled'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baic_enabled'));
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('baicR_enabled'));
  });

  test('stop observing update status before hiding >', function() {
    this.sinon.stub(this.mockCallBarring, 'unobserve');
    this.panel.init(document.body);
    this.panel.beforeHide();
    assert.isTrue(this.mockCallBarring.unobserve.calledWith('updating'));
  });

  test('get data when showing >', function() {
    this.sinon.stub(this.mockCallBarring, 'getAll');
    this.panel.init(document.body);
    this.panel.beforeShow();
    this.panel.show();
    assert.isTrue(this.mockCallBarring.getAll.calledWith(_mobileConnection));
  });

  suite('Click on item, cancel password >', function() {
    setup(function() {
      resetHTML();
      this.panel.init(document.body);

      this.sinon.stub(this.mockPasscode, 'show', function() {
        return Promise.reject();
      });
      this.sinon.spy(this.mockCallBarring, 'set');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('click on each item > ', function(done) {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      var promises = targets.map((element) => {
        var input = element.querySelector('input');
        input.click();
        assert.isFalse(input.checked, 'state doesn\'t change on click');
        assert.isTrue(this.mockPasscode.show.called, 'show passcode screen');
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              assert.isFalse(
                this.mockCallBarring.set.called, 'doesn\'t set a new value'
              );
              assert.isFalse(input.checked, 'state remains the same');
              resolve();
            } catch(e) {
              reject(e);
            }
          });
        });
      });

      Promise.all(promises).then(() => done(), done);
    });
  });

  suite('Click on item, insert wrong password >', function() {
    setup(function() {
      resetHTML();
      this.panel.init(document.body);

      this.sinon.stub(this.mockPasscode, 'show', function() {
        return Promise.resolve('0000');
      });
      this.sinon.stub(this.mockCallBarring, 'set', function() {
        return Promise.reject({
          'name': 'wrong_password',
          'message': ''
        });
      });
      this.sinon.stub(this.mockToaster, 'showToast');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('click on each item > ', function(done) {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      var promises = targets.map((element) => {
        var input = element.querySelector('input');
        input.click();
        assert.isFalse(input.checked, 'state doesn\'t change on click');
        assert.isTrue(this.mockPasscode.show.called, 'show passcode screen');
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            try {
              sinon.assert.called(this.mockCallBarring.set,
                'try to set a new value');
              sinon.assert.called(
                this.mockToaster.showToast, 'should show error'
              );
              assert.isFalse(input.checked, 'state remains the same');
              resolve();
            } catch(e) {
              reject(e);
            }
          });
        });
      });

      Promise.all(promises).then(() => done(), done);
    });
  });

  suite('Click on item, insert correct password >', function() {
    setup(function() {
      resetHTML();
      this.panel.init(document.body);

      this.sinon.stub(this.mockPasscode, 'show', function() {
        return Promise.resolve('0000');
      });
      this.sinon.stub(this.mockCallBarring, 'set', function() {
        return Promise.resolve();
      });

      this.sinon.stub(this.mockToaster, 'showToast');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('click on each item > ', function(done) {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      var promises = targets.map((element) => {
        return new Promise((resolve, reject) => {
          var input = element.querySelector('input');
          input.click();
          assert.isFalse(input.checked, 'state doesn\'t change on click');
          assert.isTrue(this.mockPasscode.show.called, 'show passcode screen');
          setTimeout(() => {
            assert.isTrue(this.mockCallBarring.set.called,
              'try to set a new value');
            assert.isFalse(this.mockToaster.showToast.called,
              'shouldn\'t show any error');
            try {
              resolve();
            } catch(e) {
              reject(e);
            }
          });
        });
      });

      Promise.all(promises).then(() => done(), done);
    });
  });

  suite('Update UI when data changes >', function() {
    setup(function() {
      resetHTML();

      this.sinon.stub(this.mockCallBarring, 'observe',
        function observe(data, callback) {
          Object.defineProperty(this.mockCallBarring, data, {
            set: function(newVal) {
              callback(newVal);
            }
          });
      }.bind(this));

      this.panel.init(document.body);
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test('activating services >', function() {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      this.panel.beforeShow(document.body);

      this.mockCallBarring.baoc = true;
      this.mockCallBarring.boic = true;
      this.mockCallBarring.boicExhc = true;
      this.mockCallBarring.baic = true;
      this.mockCallBarring.baicR = true;

      targets.forEach(function(element) {
        assert.isTrue(isItemChecked(element));
      });
    });

    test('deactivating services >', function() {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      targets.forEach(function(element) {
        element.querySelector('input').checked = true;
      });
      this.mockCallBarring.baoc = false;
      this.mockCallBarring.boic = false;
      this.mockCallBarring.boicExhc = false;
      this.mockCallBarring.baic = false;
      this.mockCallBarring.baicR = false;

      this.panel.beforeShow(document.body);
      targets.forEach(function(element) {
        assert.isFalse(isItemChecked(element));
      });
    });

    test('enabling DOM elements >', function() {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      targets.forEach(function(element) {
        element.setAttribute('aria-disabled', 'true');
      });

      this.panel.beforeShow(document.body);

      this.mockCallBarring.baoc_enabled = true;
      this.mockCallBarring.boic_enabled = true;
      this.mockCallBarring.boicExhc_enabled = true;
      this.mockCallBarring.baic_enabled = true;
      this.mockCallBarring.baicR_enabled = true;

      targets.forEach(function(element) {
        assert.isFalse(isItemDisabled(element));
      });
    });

    test('disabling DOM elements >', function() {
      var targets = [
        baocElement,
        boicElement,
        boicExhcElement,
        baicElement,
        baicRElement
      ];

      targets.forEach(function(element) {
        element.setAttribute('aria-disabled', 'false');
      });

      this.panel.beforeShow(document.body);

      this.mockCallBarring.baoc_enabled = false;
      this.mockCallBarring.boic_enabled = false;
      this.mockCallBarring.boicExhc_enabled = false;
      this.mockCallBarring.baic_enabled = false;
      this.mockCallBarring.baicR_enabled = false;

      targets.forEach(function(element) {
        assert.isTrue(isItemDisabled(element));
      });
    });
  });
});
