/* global MocksHelper, MockLockScreen, LockScreenNotifications */

'use strict';

requireApp('system/lockscreen/js/lockscreen_notifications.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForLockScreenNotifications = new MocksHelper([
  'LockScreen', 'LazyLoader'
]).init();

suite('system/LockScreenNotifications', function() {
  // little helper to build an array filled with numbers from |from| to |to|.
  // ex: range(1, 10) -> [1,2,3,...9]
  // useful for looping a specific number of iterations
  var range = (from, to) => {
    if (undefined === to) {
      to = from;
      from = 0;
    }

    var rangeGenerator = function *() {
      for(var i = from; i < to; i++){
        yield i;
      }
    };

    return Array.from(rangeGenerator());
  };

  var lockScreenNotifications;
  var stubLockScreenNotificationBuilder;
  mocksForLockScreenNotifications.attachTestHelpers();

  setup(function() {
    stubLockScreenNotificationBuilder = function() {
      this.stop = this.start = function() {};
    };
    window.LockScreenNotificationBuilder =
      stubLockScreenNotificationBuilder;
    lockScreenNotifications = new LockScreenNotifications();
    MockLockScreen.init();
    lockScreenNotifications.start(MockLockScreen,
      document.createElement('div'));
  });

  teardown(function() {
    MockLockScreen.mTeardown();
  });

  suite('Event binding >', function() {
    test('Test When locking state changed, the touchstart would be re-bound',
    function() {
      var method = LockScreenNotifications.prototype.handleEvent;
      var mockThis = {
        updateTimestamps: function() {}
      };
      var stubAddEventListener = this.sinon.stub(window, 'addEventListener');
      var stubRemoveEventListener =
        this.sinon.stub(window, 'removeEventListener');
      method.call(mockThis, { type: 'lockscreen-appclosed' });
      assert.isTrue(stubRemoveEventListener.calledWith('touchstart'));
      method.call(mockThis, { type: 'lockscreen-appopened' });
      assert.isTrue(stubAddEventListener.calledWith('touchstart'));
    });

    test('Test When visibility changed, the touchstart would be re-bound',
    function() {
      var method = LockScreenNotifications.prototype.handleEvent;
      var mockThis = {
        updateTimestamps: function() {}
      };
      var stubAddEventListener = this.sinon.stub(window, 'addEventListener');
      var stubRemoveEventListener =
        this.sinon.stub(window, 'removeEventListener');
      Object.defineProperty(document, 'hidden',
        { value: true, writable: true });
      method.call(mockThis, { type: 'visibilitychange' });
      assert.isTrue(stubRemoveEventListener.calledWith('touchstart'));
      Object.defineProperty(document, 'hidden', { value: false });
      method.call(mockThis, { type: 'visibilitychange' });
      assert.isTrue(stubAddEventListener.calledWith('touchstart'));
    });
  });

  test('Test Show Colored Masked Background', function() {
    MockLockScreen.maskedBackground = {
      style: {
        backgroundColor: null
      },
      dataset: {
        wallpaperColor: 'rgba(123, 123, 123, 0.5)'
      },
      classList: {
        remove: this.sinon.spy()
      }
    };
    lockScreenNotifications._lockScreen = MockLockScreen;

    lockScreenNotifications.showColoredMaskBG();

    assert.equal(
      MockLockScreen.maskedBackground.style.backgroundColor,
      'rgba(123, 123, 123, 0.5)',
      'BGColor colors mismatch'
    );

    assert.isTrue(
      MockLockScreen.maskedBackground.classList.remove.calledWith('blank')
    );
  });

  test('Test Hide Colored Masked Background', function() {
    MockLockScreen.maskedBackground = {
      style: {
        backgroundColor: null
      },
      classList: {
        add: this.sinon.spy()
      }
    };
    lockScreenNotifications._lockScreen = MockLockScreen;

    lockScreenNotifications.hideColoredMaskBG();

    assert.equal(
      MockLockScreen.maskedBackground.style.backgroundColor,
      'transparent',
      'BGColor colors mismatch'
    );

    assert.isTrue(
      MockLockScreen.maskedBackground.classList.add.calledWith('blank')
    );
  });

  test('Test Collapse Notifications', function() {
    MockLockScreen.notificationsContainer = {
      classList: {
        add: this.sinon.spy()
      }
    };
    MockLockScreen.notificationArrow = {
      classList: {
        add: this.sinon.spy()
      }
    };

    lockScreenNotifications._lockScreen = MockLockScreen;

    lockScreenNotifications.collapseNotifications();

    assert.isTrue(
      MockLockScreen.notificationsContainer.classList.add.calledWith(
        'collapsed'
      )
    );

    assert.isTrue(
      MockLockScreen.notificationArrow.classList.add.calledWith(
        'collapsed'
      )
    );
  });

  test('Test Expand Notifications', function() {
    MockLockScreen.notificationsContainer = {
      classList: {
        remove: this.sinon.spy()
      }
    };
    MockLockScreen.notificationArrow = {
      classList: {
        remove: this.sinon.spy()
      }
    };

    lockScreenNotifications._lockScreen = MockLockScreen;

    lockScreenNotifications.expandNotifications();

    assert.isTrue(
      MockLockScreen.notificationsContainer.classList.remove.calledWith(
        'collapsed'
      )
    );

    assert.isTrue(
      MockLockScreen.notificationArrow.classList.remove.calledWith(
        'collapsed'
      )
    );
  });

  test('Test Adjust Container Visual Hints', function() {
    MockLockScreen.notificationsContainer = {
      clientHeight: undefined,
      scrollHeight: undefined,
      scrollTop: undefined
    };

    lockScreenNotifications._lockScreen = MockLockScreen;

    // container can't be scrolled

    var stubSetMaskVisibility =
      this.sinon.stub(lockScreenNotifications, '_setMaskVisibility');
    var stubSetArrowVisibility =
      this.sinon.stub(lockScreenNotifications, '_setArrowVisibility');

    MockLockScreen.notificationsContainer = {
      clientHeight: 100,
      scrollHeight: 100,
      scrollTop: 0
    };
    lockScreenNotifications.adjustContainerVisualHints();

    assert.isTrue(stubSetMaskVisibility.calledWith(false, false));
    assert.isTrue(stubSetArrowVisibility.calledWith(false));

    // container can be scrolled, currently at top
    stubSetMaskVisibility.reset();
    stubSetArrowVisibility.reset();

    MockLockScreen.notificationsContainer = {
      clientHeight: 100,
      scrollHeight: 150,
      scrollTop: 0
    };
    lockScreenNotifications.adjustContainerVisualHints();

    assert.isTrue(stubSetMaskVisibility.calledWith(false, false));
    assert.isTrue(stubSetArrowVisibility.calledWith(true));

    // container can be scrolled, currently at middle
    stubSetMaskVisibility.reset();
    stubSetArrowVisibility.reset();

    MockLockScreen.notificationsContainer = {
      clientHeight: 100,
      scrollHeight: 150,
      scrollTop: 20
    };
    lockScreenNotifications.adjustContainerVisualHints();

    assert.isTrue(stubSetMaskVisibility.calledWith(false, true));
    assert.isTrue(stubSetArrowVisibility.calledWith(false));

    // container can be scrolled, currently at bottom
    stubSetMaskVisibility.reset();
    stubSetArrowVisibility.reset();

    MockLockScreen.notificationsContainer = {
      clientHeight: 100,
      scrollHeight: 150,
      scrollTop: 50
    };
    lockScreenNotifications.adjustContainerVisualHints();

    assert.isTrue(stubSetMaskVisibility.calledWith(true, false));
    assert.isTrue(stubSetArrowVisibility.calledWith(false));
  });

  suite('Test Set Mask Visibility', function() {
    setup(function() {
      MockLockScreen.notificationsContainer = {
        classList: {
          add: this.sinon.spy(),
          remove: this.sinon.spy()
        }
      };
    });

    teardown(function() {
      MockLockScreen.notificationsContainer = undefined;
    });

    test('top = true, both = false', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setMaskVisibility(true, false);

      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-top'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-both'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-top'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-both'
        )
      );
    });

    test('top = false, both = true', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setMaskVisibility(false, true);

      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-top'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-top'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-both'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-both'
        )
      );
    });

    test('top = true, both = true', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setMaskVisibility(true, true);

      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-top'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-top'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-both'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-both'
        )
      );
    });

    test('top = false, both = false', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setMaskVisibility(false, false);

      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-top'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-top'
        )
      );
      assert.isFalse(
        MockLockScreen.notificationsContainer.classList.add.calledWith(
          'masked-both'
        )
      );
      assert.isTrue(
        MockLockScreen.notificationsContainer.classList.remove.calledWith(
          'masked-both'
        )
      );
    });
  });

  suite('Test Set Arrow Visibility', function() {
    setup(function() {
      MockLockScreen.notificationArrow = {
        classList: {
          add: this.sinon.spy(),
          remove: this.sinon.spy()
        }
      };
    });

    teardown(function() {
      MockLockScreen.notificationArrow = undefined;
    });

    test('visible = true', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setArrowVisibility(true);

      assert.isTrue(
        MockLockScreen.notificationArrow.classList.add.calledWith(
          'visible'
        )
      );
      assert.isFalse(MockLockScreen.notificationArrow.classList.remove.called);
    });

    test('visible = false', function() {
      lockScreenNotifications._lockScreen = MockLockScreen;
      lockScreenNotifications._setArrowVisibility(false);

      assert.isTrue(
        MockLockScreen.notificationArrow.classList.remove.calledWith(
          'visible'
        )
      );
      assert.isFalse(MockLockScreen.notificationArrow.classList.add.called);
    });

  });

  test('Test ScrollToTop', function() {
    MockLockScreen.notificationsContainer = {
      scrollTop: 1000
    };

    lockScreenNotifications._lockScreen = MockLockScreen;

    lockScreenNotifications.scrollToTop();

    assert.equal(
      MockLockScreen.notificationsContainer.scrollTop,
      0,
      'Container was not scrolled to scrollTop = 0'
    );
  });

  suite('_getNumNotificationInContainerViewport', function() {
    var stubGetWindowInnerDimension;

    setup(function(){
      stubGetWindowInnerDimension =
        this.sinon.stub(lockScreenNotifications, '_getWindowInnerDimension');
    });

    test('innerHeight > 480, without music player (4 notifications)',
    function() {
      stubGetWindowInnerDimension.returns({
        width: window.innderWidth,
        height: 640
      });

      assert.equal(
        lockScreenNotifications._getNumNotificationInContainerViewport(),
        4
      );
    });

    test('innerHeight > 480, with music player (3 notifications)',
    function() {
      stubGetWindowInnerDimension.returns({
        width: window.innderWidth,
        height: 640
      });
      lockScreenNotifications.container.classList.add('collapsed');

      assert.equal(
        lockScreenNotifications._getNumNotificationInContainerViewport(),
        3
      );
    });

    test('innerHeight <= 480, without music player (3 notifications)',
    function() {
      stubGetWindowInnerDimension.returns({
        width: window.innderWidth,
        height: 360
      });

      assert.equal(
        lockScreenNotifications._getNumNotificationInContainerViewport(),
        3
      );
    });

    test('innerHeight <= 480, with music player (2 notifications)',
    function() {
      stubGetWindowInnerDimension.returns({
        width: window.innderWidth,
        height: 360
      });
      lockScreenNotifications.container.classList.add('collapsed');

      assert.equal(
        lockScreenNotifications._getNumNotificationInContainerViewport(),
        2
      );
    });
  });


  suite('Remove top mask when actionable notification is at the visual top of' +
        'the container viewport', function(){
    // for test's sake, add 4 notifications in the notifications container, and
    // suppose 1-indexed one is the visually top notification in the viewport
    // (i.e 3 notifications are visible in the viewport)

    const numTestNotifications = 4;
    const numNotificationInViewport = 3;

    var stubGetNumNotificationInContainerViewport;

    suiteSetup(function(){
      stubGetNumNotificationInContainerViewport =
        sinon.stub(lockScreenNotifications,
                   '_getNumNotificationInContainerViewport')
        .returns(numNotificationInViewport);
    });

    setup(function(){
      range(numTestNotifications).forEach(index => {
        var node = document.createElement('div');
        node.classList.add('notification');
        node.classList.add('actionable');
        node.dataset.notificationId = 'id-' + index;
        lockScreenNotifications.container.appendChild(node);
      });
    });

    suite('top-actionable class is correctly added in ' +
          'onNotificationHighlighted',
      function() {

      // We are testing them in HVGA suite.
      setup(function() {
        var stubGetWindowInnerDimension =
          this.sinon.stub(lockScreenNotifications, '_getWindowInnerDimension');
        stubGetWindowInnerDimension.returns({
          width: window.innderWidth,
          height: 480
        });
      });

      // we then see if the class is added correctly, or not added,
      // when we try to highlight each notification.

      var testTopActionableClass = function(notificationIndex, expected) {
        var id = 'id-' + notificationIndex;

        lockScreenNotifications.onNotificationHighlighted(id, 123000);

        assert.equal(
          lockScreenNotifications.container.classList.contains(
            'top-actionable'
          ),
          expected,
          'with notification index ' + notificationIndex + ' container should' +
          (!expected ? ' not' : '') + ' have the top-actionable class'
        );
      };

      range(numTestNotifications).forEach(index => {
        // the notification is the visually top in the viewport if its rev-index
        // is the number of notifications visible in the viewport; its (normal)
        // index would be (numNotifications - numVisibleNotifications);
        // we expect that notification, when highlighted, to trigger
        // |top-actionable| class to be added.
        test('test on ' + index + '-th notification', () => {
          testTopActionableClass(
            index,
            (numTestNotifications - numNotificationInViewport) === index
          );
        });
      });
    });

    suite('_tryAddTopMaskByNotification is correctly called in ' +
          'onCleanHighlighted and onNotificationsBlur',
      function() {
      const testId = 'id-1';
      var stubTryAddTopMaskByNotification;
      var stubRemoveNotificationHighlight;
      var targetNotificationNode;

      setup(function(){

      // We are testing them in HVGA suite.
      var stubGetWindowInnerDimension =
        this.sinon.stub(lockScreenNotifications, '_getWindowInnerDimension');
      stubGetWindowInnerDimension.returns({
        width: window.innderWidth,
        height: 480
      });


        stubTryAddTopMaskByNotification =
          this.sinon.stub(lockScreenNotifications,
                          '_tryAddTopMaskByNotification');

        stubRemoveNotificationHighlight =
          this.sinon.stub(lockScreenNotifications,
                          'removeNotificationHighlight');

        targetNotificationNode =
          lockScreenNotifications.container.querySelector(
            '[data-notification-id="' + testId + '"]'
          );

        lockScreenNotifications.states.currentHighlighted =
          targetNotificationNode;

        lockScreenNotifications.states.currentHighlightedId = testId;

        lockScreenNotifications.states.highlightedNotifications[testId] =
          123000;
      });

      test('onCleanHighlighted', function (){
        var timestamp =
          123000 + lockScreenNotifications.configs.timeoutHighlighted + 1;

        lockScreenNotifications.onCleanHighlighted(testId, timestamp);

        assert.isTrue(
          stubTryAddTopMaskByNotification.calledWith(targetNotificationNode)
        );
      });

      test('onNotificationsBlur', function (){
        lockScreenNotifications.onNotificationsBlur();

        assert.isTrue(
          stubTryAddTopMaskByNotification.calledWith(targetNotificationNode)
        );
      });
    });

    test('In HVGA mode with music player on thr screen, the highlighting ' +
         'request should be permitted when there is a new node',
    function() {
      this.sinon.stub(lockScreenNotifications, '_getWindowInnerDimension',
      function() {
        return { height: 480, width: 320 };
      });
      var stubContainer = {
        getBoundingClientRect () {
          return { top: 193, bottom: 251};
        }
      };
      var stubNode = {
        getBoundingClientRect () {
          return { top: 203, bottom: 252 };
        }
      };
      var originalContainer = lockScreenNotifications.container;
      lockScreenNotifications.container = stubContainer;
      assert.isFalse(lockScreenNotifications
        .notificationOutOfViewport(stubNode),
        'The request is denied.');
      lockScreenNotifications.container = originalContainer;
    });

    suite('top-actionable class is correctly removed with ' +
          'tryAddTopMaskByNotification',
      function() {
      // we then see if the class is removed correctly, or not removed,
      // when we try to un-highlight each notification.

      setup(function(){
        // We are testing them in HVGA suite.
        var stubGetWindowInnerDimension =
          this.sinon.stub(lockScreenNotifications, '_getWindowInnerDimension');
        stubGetWindowInnerDimension.returns({
          width: window.innderWidth,
          height: 480
        });

        lockScreenNotifications.container.classList.add('top-actionable');
      });

      var testTopActionableClass = function(notificationIndex, expected) {
        var id = 'id-' + notificationIndex;

        var notificationNode =
          lockScreenNotifications.container.querySelector(
            '[data-notification-id="' + id + '"]'
          );

        lockScreenNotifications._tryAddTopMaskByNotification(notificationNode);

        assert.equal(
          lockScreenNotifications.container.classList.contains(
            'top-actionable'
          ),
          expected,
          'with notification index ' + notificationIndex + ' container should' +
          (!expected ? ' not' : '') + ' have the top-actionable class'
        );
      };

      range(numTestNotifications).forEach(index => {
        // the notification is the visually top in the viewport if its rev-index
        // is the number of notifications visible in the viewport; its (normal)
        // index would be (numNotifications - numVisibleNotifications);
        // we expect that notification, when unhighlighted, to trigger
        // |top-actionable| class to be removed.
        test('test on ' + index + '-th notification', () => {
          testTopActionableClass(
            index,
            (numTestNotifications - numNotificationInViewport) !== index
          );
        });
      });
    });
  });
});
