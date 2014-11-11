'use strict';

suite('about > factory_reset', function() {
  var factoryReset;
  var realNavigatorPower;
  var modules = [
    'panels/about/factory_reset'
  ];
  var maps = {
    '*': {}
  };

  var MockPower = {
    factoryReset: function() {}
  };

  var elements = {
    resetButton: document.createElement('button'),
    resetDialog: document.createElement('form'),
    resetConfirm: document.createElement('button'),
    resetCancel: document.createElement('button')
  };
  elements.resetDialog.hidden = true;

  suiteSetup(function(done) {
    testRequire(modules, maps,
      function(module) {
        realNavigatorPower = navigator.mozPower;
        navigator.mozPower = MockPower;

        factoryReset = module();
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
      factoryReset._elements.resetButton.click();
      assert.ok(factoryReset._resetClick.called);
    });
  });

  suite('resetClick', function() {
    setup(function() {
      this.sinon.stub(factoryReset, '_factoryReset');
      factoryReset.init(elements);
    });

    test('resetDialog is shown when calling resetClick', function() {
      factoryReset._resetClick();
      assert.equal(factoryReset._elements.resetDialog.hidden, false);
    });

    test('resetDialog is hidden when cancel button is clicked', function() {
      factoryReset._resetClick();
      factoryReset._elements.resetCancel.click();
      assert.equal(factoryReset._elements.resetDialog.hidden, true);
    });

    test('factoryReset is called when confirm button is clicked', function() {
      factoryReset._resetClick();
      factoryReset._elements.resetConfirm.click();
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
