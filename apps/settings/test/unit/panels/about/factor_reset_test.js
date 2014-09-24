'use strict';

suite('about > factory_reset', function() {
  var factoryReset;
  var realNavigatorPower;
  var elements = {};

  var modules = [
    'panels/about/factory_reset'
  ];
  var maps = {
    '*': {}
  };

  var MockPower = {
    factoryReset: function() {}
  };

  suiteSetup(function(done) {
    testRequire(modules, maps,
      function(module) {
        realNavigatorPower = navigator.mozPower;
        navigator.mozPower = MockPower;

        factoryReset = module();

        var updateNodes =
        '<ul>' +
          '<li>' +
            '<button class="reset-phone">Reset Phone</button>' +
          '</li>' +
        '</ul>' +
        '<form role="dialog" data-type="confirm"' +
          'class="reset-phone-dialog" hidden>' +
          '<section>' +
          '</section>' +
          '<menu>' +
            '<button class="cancel-reset-phone">Cancel</button>' +
            '<button class="confirm-reset-phone danger">Reset</button>' +
          '</menu>' +
        '</form>';

        document.body.insertAdjacentHTML('beforeend', updateNodes);

        elements.resetButton = document.querySelector('.reset-phone');
        elements.resetDialog =
          document.querySelector('.reset-phone-dialog');
        elements.resetConfirm =
          document.querySelector('.confirm-reset-phone');
        elements.resetCancel =
          document.querySelector('.cancel-reset-phone');
        done();
    });
  });

  suiteTeardown(function() {
    navigator.mozPower = realNavigatorPower;
    realNavigatorPower = null;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(factoryReset, '_resetClick');
    });

    test('resetButton is enabled when mozPower exist', function() {
      factoryReset.init(elements);
      assert.equal(factoryReset._elements.resetButton.disabled, false);
    });

    test('resetButton is disabled when mozPower does not exist', function() {
      navigator.mozPower = null;
      factoryReset.init(elements);
      assert.equal(factoryReset._elements.resetButton.disabled, true);
      navigator.mozPower = MockPower;
    });

    test('resetButton is enabled when mozPower exist', function() {
      factoryReset.init(elements);
      factoryReset._elements.resetButton
        .dispatchEvent(new CustomEvent('click'));
      assert.ok(factoryReset._resetClick.called);
    });
  });

  suite('resetClick', function() {
    setup(function() {
      this.sinon.stub(factoryReset, '_factoryReset');
      factoryReset.init(elements);
      factoryReset._resetClick();
    });

    test('resetDialog is shown when calling resetClick', function() {
      assert.equal(factoryReset._elements.resetDialog.hidden, false);
    });

    test('resetDialog is hidden when cancel button is clicked', function() {
      factoryReset._elements.resetCancel
        .dispatchEvent(new CustomEvent('click'));
      assert.equal(factoryReset._elements.resetDialog.hidden, true);
    });

    test('factoryReset is called when confirm button is clicked', function() {
      factoryReset._elements.resetConfirm
        .dispatchEvent(new CustomEvent('click'));
      assert.ok(factoryReset._factoryReset.called);
    });
  });

  suite('factoryReset', function() {
    setup(function() {
      this.sinon.spy(navigator.mozPower, 'factoryReset');
      factoryReset._factoryReset();
    });

    test('mozPower factoryReset is called', function() {
      assert.ok(navigator.mozPower.factoryReset.called);
    });
  });
});
