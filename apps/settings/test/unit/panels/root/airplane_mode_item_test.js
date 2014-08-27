'use strict';

suite('AirplaneModeItem', function() {
  var map = {
    '*': {
      'shared/airplane_mode_helper': 'unit/mock_airplane_mode_helper'
    }
  };

  var modules = [
    'panels/root/airplane_mode_item',
    'unit/mock_airplane_mode_helper'
  ];

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    requireCtx(modules, function(AirplaneModeItem, MockAirplaneModeHelper) {
      var element = document.createElement('input');
      element.type = 'checkbox';

      this.element = element;
      this.AirplaneModeItem = AirplaneModeItem;
      this.MockAirplaneModeHelper = MockAirplaneModeHelper;
      done();
    }.bind(this));
  });

  test('when init is called, we would wait until APMhelper is ready',
    function() {
      this.sinon.stub(this.MockAirplaneModeHelper, 'ready');
      var airplaneModeItem = this.AirplaneModeItem(this.element);
      airplaneModeItem.init();
      assert.isTrue(this.MockAirplaneModeHelper.ready.called);
  });

  test('when item is enabled, we would start observing change', function() {
    this.sinon.stub(this.MockAirplaneModeHelper, 'addEventListener');
    var airplaneModeItem = this.AirplaneModeItem(this.element);
    airplaneModeItem._itemEnabled = false;
    airplaneModeItem.enabled = true;
    assert.isTrue(this.MockAirplaneModeHelper.addEventListener.called);
  });
  
  test('when item is enabled, we would stop observing change', function() {
    this.sinon.stub(this.MockAirplaneModeHelper, 'removeEventListener');
    var airplaneModeItem = this.AirplaneModeItem(this.element);
    airplaneModeItem._itemEnabled = true;
    airplaneModeItem.enabled = false;
    assert.isTrue(this.MockAirplaneModeHelper.removeEventListener.called);
  });

  suite('when onAPMstateChange is triggered', function() {
    var airplaneModeItem;
    setup(function() {
      airplaneModeItem = this.AirplaneModeItem(this.element);
    });

    ['enabled', 'disabled'].forEach(function(status) {
      test('status is ' + status + ', let UI clickable', function() {
        airplaneModeItem._onAPMStateChange(status); 
        assert.equal(this.element.checked, (status === 'enabled'));
        assert.isFalse(this.element.disabled);
      });
    });

    ['enabling', 'disabling'].forEach(function(status) {
      test('status is ' + status + ', let UI unclickable', function() {
        airplaneModeItem._onAPMStateChange(status); 
        assert.isTrue(this.element.disabled);
      });
    });
  });
});
