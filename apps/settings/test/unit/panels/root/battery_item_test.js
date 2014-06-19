'use strict';

mocha.globals(['MockL10n']);

suite('LanguageItem', function() {
  var realL10n;
  var modules = [
    'unit/mock_l10n',
    'panels/root/battery_item',
  ];
  var map = {
    '*': {
      'modules/battery': 'MockBattery'
    }
  };

  suiteSetup(function(done) {
    this.MockBattery = {
      state: 'charging',
      level: 10,
      observe: function() {},
      unobserve: function() {}
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockBattery', function() {
      return this.MockBattery;
    }.bind(this));

    requireCtx(modules, function(MockL10n, BatteryItem) {
      realL10n = window.navigator.mozL10n;
      this.MockL10n = MockL10n;
      window.navigator.mozL10n = MockL10n;

      this.BatteryItem = BatteryItem;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.element = document.createElement('div');
    this.subject = this.BatteryItem(this.element);
  });

  test('when enabled = true', function() {
    this.sinon.stub(this.MockBattery, 'observe');
    this.sinon.stub(this.subject, '_boundRefreshText');
    this.subject.enabled = true;

    sinon.assert.called(this.subject._boundRefreshText);
    sinon.assert.calledTwice(this.MockBattery.observe);
    assert.equal(this.MockBattery.observe.args[0][0], 'level');
    assert.equal(this.MockBattery.observe.args[0][1],
      this.subject._boundRefreshText);
    assert.equal(this.MockBattery.observe.args[1][0], 'state');
    assert.equal(this.MockBattery.observe.args[1][1],
      this.subject._boundRefreshText);
  });

  test('when enabled = false', function() {
    this.sinon.stub(this.MockBattery, 'unobserve');
    this.sinon.stub(this.subject, '_boundRefreshText');
    // The default enabled value is false. Set to true first.
    this.subject.enabled = true;
    this.subject.enabled = false;

    sinon.assert.calledTwice(this.MockBattery.unobserve);
    assert.equal(this.MockBattery.unobserve.args[0][0], 'level');
    assert.equal(this.MockBattery.unobserve.args[0][1],
      this.subject._boundRefreshText);
    assert.equal(this.MockBattery.unobserve.args[1][0], 'state');
    assert.equal(this.MockBattery.unobserve.args[1][1],
      this.subject._boundRefreshText);
  });

  suite('_boundRefreshText', function() {
    test('should call to localize correctly', function() {
      this.sinon.stub(this.MockL10n, 'localize');
      this.subject._boundRefreshText();
      sinon.assert.calledWith(this.MockL10n.localize, this.element,
        'batteryLevel-percent-' + this.MockBattery.state,
        sinon.match({level: this.MockBattery.level}));
    });
  });
});
