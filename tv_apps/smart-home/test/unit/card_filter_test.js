/* global MockSmartButton, MockMenuGroup, CardFilter */
'use strict';
require('/shared/test/unit/mocks/mock_event_target.js');
require('/bower_components/evt/index.js');
requireApp('smart-home/test/unit/mock_smart_button.js');
requireApp('smart-home/test/unit/mock_menu_group.js');
requireApp('smart-home/js/card_filter.js');

suite('smart-home/CardFilter', function() {
  var cardFilter;
  var mockMenuGroup;
  var mockSmartButtons;

  var generateSmartButtons = function() {
    return [
      new MockSmartButton('filter'),
      new MockSmartButton('tv'),
      new MockSmartButton('dashbaord'),
      new MockSmartButton('device'),
      new MockSmartButton('application')
    ];
  };

  suite('> start', function() {
    setup(function() {
      mockSmartButtons = generateSmartButtons();
      mockSmartButtons.forEach(function(button) {
        sinon.spy(button, 'addEventListener');
      });

      mockMenuGroup = new MockMenuGroup();
      sinon.stub(mockMenuGroup, 'querySelectorAll', function() {
        return mockSmartButtons;
      });
      sinon.spy(mockMenuGroup, 'addEventListener');
      cardFilter = new CardFilter();
    });

    teardown(function() {
      mockMenuGroup = undefined;
      cardFilter = undefined;
      mockSmartButtons = undefined;
    });

    test('start() should register "click" event listeners on smart-button',
      function() {
        cardFilter.start(mockMenuGroup);
        assert.isTrue(mockMenuGroup.querySelectorAll.calledOnce);
        mockSmartButtons.forEach(function(button) {
          assert.isTrue(button.addEventListener.calledOnce);
        });
      });

    test('start() should listen to "opened" event on menu group', function() {
        cardFilter.start(mockMenuGroup);
        assert.isTrue(mockMenuGroup.addEventListener.calledOnce);
        var call = mockMenuGroup.addEventListener.firstCall;
        assert.equal(call.args[0], 'opened');
        assert.isTrue(typeof call.args[1] === 'function');
    });
  });

  suite('> stop', function() {
    setup(function() {
      mockSmartButtons = generateSmartButtons();
      mockSmartButtons.forEach(function(button) {
        sinon.spy(button, 'removeEventListener');
      });

      mockMenuGroup = new MockMenuGroup();
      sinon.stub(mockMenuGroup, 'querySelectorAll', function() {
        return mockSmartButtons;
      });
      cardFilter = new CardFilter();
      cardFilter.start(mockMenuGroup);
    });

    teardown(function() {
      mockMenuGroup = undefined;
      cardFilter = undefined;
      mockSmartButtons = undefined;
    });

    test('stop() should remove "click" event listeners on smart-button',
      function() {
        cardFilter.stop();
        mockSmartButtons.forEach(function(button) {
          assert.isTrue(button.removeEventListener.calledOnce);
        });
      });
  });

  suite('> handleEvent', function() {
    setup(function() {
      mockSmartButtons = generateSmartButtons();

      mockMenuGroup = new MockMenuGroup();
      sinon.stub(mockMenuGroup, 'querySelectorAll', function() {
        return mockSmartButtons;
      });
      cardFilter = new CardFilter();
      sinon.spy(cardFilter, 'handleEvent');
      cardFilter.start(mockMenuGroup);
    });

    teardown(function() {
      mockMenuGroup = undefined;
      cardFilter = undefined;
      mockSmartButtons = undefined;
    });

    test('handleEvent() should be called with event argument', function() {
      mockSmartButtons[0].dispatchEvent({
        type: 'click'
      });
      assert.isTrue(cardFilter.handleEvent.calledOnce);
      assert.equal(cardFilter.handleEvent.getCall(0).args[0].type, 'click');
    });
  });

  suite('> filter', function() {
    setup(function() {
      mockSmartButtons = generateSmartButtons();

      mockMenuGroup = new MockMenuGroup();
      sinon.stub(mockMenuGroup, 'querySelectorAll', function() {
        return mockSmartButtons;
      });
      cardFilter = new CardFilter();
      cardFilter.filter = 'filter';
      sinon.spy(cardFilter, 'emit');
      cardFilter.start(mockMenuGroup);
    });

    teardown(function() {
      mockMenuGroup = undefined;
      cardFilter = undefined;
      mockSmartButtons = undefined;
    });

    test('should fire filterchanged event when filter is changed', function() {
      cardFilter.filter = 'tv';
      assert.isTrue(cardFilter.emit.calledOnce);
      assert.equal(cardFilter.emit.getCall(0).args[0], 'filterchanged');
      assert.equal(cardFilter.emit.getCall(0).args[1], 'tv');
    });
  });

  suite('> show and hide', function() {
    setup(function() {
      mockSmartButtons = generateSmartButtons();

      mockMenuGroup = new MockMenuGroup();
      sinon.stub(mockMenuGroup, 'querySelectorAll', function() {
        return mockSmartButtons;
      });
      sinon.spy(mockMenuGroup.classList, 'add');
      sinon.spy(mockMenuGroup.classList, 'remove');
      cardFilter = new CardFilter();
      cardFilter.filter = 'filter';
      cardFilter.start(mockMenuGroup);
    });

    teardown(function() {
      mockMenuGroup.classList.add.restore();
      mockMenuGroup.classList.remove.restore();
      mockMenuGroup = undefined;
      cardFilter = undefined;
      mockSmartButtons = undefined;
    });

    test('should add "hidden" class to menu group when calling hide()',
      function() {
        cardFilter.hide();
        assert.isTrue(mockMenuGroup.classList.add.calledWithExactly('hidden'));
      });

    test('should remove "hidden" class from menu group when calling show()',
      function() {
        cardFilter.show();
        assert.isTrue(
          mockMenuGroup.classList.remove.calledWithExactly('hidden'));
      });
  });

});
