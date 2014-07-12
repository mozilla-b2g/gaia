/* global MocksHelper, MockLockScreen, LockScreenNotifications */

'use strict';

requireApp('system/js/lockscreen_notifications.js');
requireApp('system/test/unit/mock_lock_screen.js');

var mocksForLockScreenNotifications = new MocksHelper([
  'LockScreen'
]).init();

suite('system/LockScreenNotifications', function() {
  var lockScreenNotifications;
  mocksForLockScreenNotifications.attachTestHelpers();

  setup(function() {
    lockScreenNotifications = new LockScreenNotifications();
    MockLockScreen.init();
  });

  teardown(function() {
    MockLockScreen.mTeardown();
  });

  test('Test Bind Lockscreen', function() {
    lockScreenNotifications.bindLockScreen('FakeLockscreen');
    assert.equal(lockScreenNotifications._lockScreen, 'FakeLockscreen');
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

});
