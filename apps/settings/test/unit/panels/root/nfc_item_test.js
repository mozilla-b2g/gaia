'use strict';

suite('NFCItem', function() {
  var realMozNfc;

  var map = {
    '*': {
      'shared/settings_listener':'shared_mocks/mock_settings_listener'
    }
  };

  var modules = [
    'panels/root/nfc_item',
    'shared_mocks/mock_settings_listener',
  ];

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    requireCtx(modules, (NFCItem, MockSettingsListener) => {
      var div = document.createElement('div');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      div.appendChild(checkbox);

      this.div = div;
      this.checkbox = checkbox;
      this.NFCItem = NFCItem;
      this.MockSettingsListener = MockSettingsListener;

      realMozNfc = window.navigator.mozNfc;
      window.navigator.mozNfc = {};

      done();
    });
  });

  teardown(function() {
    window.navigator.mozNfc = realMozNfc;
  });

  test('is visible and initialized if mozNfc defined', function() {
    var stubObserver = this.sinon.stub(this.MockSettingsListener, 'observe');
    var stubAddListener = this.sinon.stub(this.checkbox, 'addEventListener');

    var nfcItem = this.NFCItem({
      nfcMenuItem: this.div,
      nfcCheckBox: this.checkbox
    });

    assert.isFalse(this.div.hidden, 'hidden');
    assert.deepEqual(nfcItem._checkbox, this.checkbox);

    assert.isTrue(stubAddListener.calledOnce, 'addEventListener');
    assert.equal(stubAddListener.firstCall.args[0], 'change');

    assert.isTrue(stubObserver.calledOnce, 'observe');
    assert.equal(stubObserver.firstCall.args[0], 'nfc.status');
  });

  test('setts checkbox to disabled on toggle change', function() {
    var nfcItem = this.NFCItem({
      nfcMenuItem: this.div,
      nfcCheckBox: this.checkbox
    });

    var spyCheckboxChanged = this.sinon.spy(nfcItem, '_onCheckboxChanged');
    this.checkbox.disabled = false;

    this.checkbox.dispatchEvent(new CustomEvent('change'));
    assert.isTrue(spyCheckboxChanged.calledOnce);
    assert.isTrue(this.checkbox.disabled);
  });

  suite('NFC status changes', function() {
    var nfcItem;
    var stubNfcChanged;
    var idleStatus = ['enabled', 'disabled'];
    var transitionStatus = ['enabling', 'disabling'];

    setup(function() {
      nfcItem = this.NFCItem({
        nfcMenuItem: this.div,
        nfcCheckBox: this.checkbox
      });
      stubNfcChanged = this.sinon.spy(nfcItem, '_onNfcStatusChanged');
    });

    teardown(function() {
      stubNfcChanged.restore();
    });

    idleStatus.forEach((status) => {
      test('checkbox should be enabled when nfc.status ' + status, function() {
        nfcItem._checkbox.disabled = true;

        this.MockSettingsListener.mTriggerCallback('nfc.status', status);
        assert.isTrue(stubNfcChanged.withArgs(status).calledOnce);
        assert.isFalse(nfcItem._checkbox.disabled);
      });
    });

    transitionStatus.forEach((status) => {
      test('checkbox should be disabled when nfc.status ' + status, function() {
        nfcItem._checkbox.disabled = false;

        this.MockSettingsListener.mTriggerCallback('nfc.status', status);
        assert.isTrue(stubNfcChanged.withArgs(status).calledOnce);
        assert.isTrue(nfcItem._checkbox.disabled);
      });
    });
  });
});
