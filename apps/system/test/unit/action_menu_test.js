'use strict';
/* global ActionMenu, Event, MockL10n, MocksHelper */

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/js/action_menu.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForActionMenu = new MocksHelper([
  'Service'
]).init();

suite('ActionMenu', function() {
  mocksForActionMenu.attachTestHelpers();
  var activitiesMockup, realL10n, genericActionsMockup, rafStub;
  var iconUrl = 'images/icon.png', title = 'Title';
  var screenElement;

  function getMenu() {
    return screenElement.querySelector('[data-type="action"]');
  }

  function resetHTML() {
    document.body.innerHTML = '';
    loadBodyHTML('/index.html');
    screenElement = document.getElementById('screen');
    // reload too in case is on memory
    getMenu();
  }

  suiteSetup(function() {
    activitiesMockup = [
      {
        value: 1,
        label: 'Activity',
        icon: iconUrl
      },
      {
        value: 2,
        label: 'Activity',
        icon: iconUrl
      }
    ];

    genericActionsMockup = [
      {
        value: 1,
        label: 'Action'
      },
      {
        value: 2,
        label: 'Action',
        icon: iconUrl
      },
      {
        value: 3,
        label: 'Action'
      }
    ];

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    rafStub = sinon.stub(window, 'requestAnimationFrame',
                         function(callback) { callback(); });

    resetHTML();
  });

  suiteTeardown(function() {
    rafStub.restore();
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite(' > Structure & Basic methods', function() {
    setup(function() {
      resetHTML();
    });

    test(' > init', function() {
      // We must have *only* one action menu in system
      var menu = new ActionMenu(genericActionsMockup, title);
      menu.start();

      // We should have only one 'action' menu in system
      var actionMenus = screenElement.querySelectorAll('[data-type="action"]');
      assert.equal(actionMenus.length, 1);

      // Check header
      var headers = getMenu().getElementsByTagName('header');
      assert.equal(headers.length, 1);

      // Check menu
      var menus = getMenu().getElementsByTagName('menu');
      assert.equal(menus.length, 1);
      menu.stop();
    });

    test(' > setTitle', function() {
      var menu = new ActionMenu(activitiesMockup, title);
      menu.start();
      assert.equal(
        getMenu().querySelector('header').getAttribute('data-l10n-id'), title);
      menu.stop();
    });

    test(' > open > activities', function() {
      // Activities have their own icons
      var menu = new ActionMenu(activitiesMockup, title);
      menu.start();
      var actions = getMenu().getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, activitiesMockup.length + 1);
      // We need only icons in the actions, not in the cancel
      var icons = getMenu().getElementsByClassName('icon');
      assert.equal(icons.length, activitiesMockup.length);
      menu.stop();
    });

    test(' > open > buildMenu', function() {
      // Call to show activities
      var menu = new ActionMenu(activitiesMockup, title);
      menu.start();
      var actions = getMenu().getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, activitiesMockup.length + 1);
      menu.stop();

      // Call to show other activities
      var menu2 = new ActionMenu(genericActionsMockup);
      menu2.start();
      // Now the layout should be clean and with a new number of options
      actions = getMenu().getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, genericActionsMockup.length + 1);
      menu2.stop();
    });

    test(' > open > show', function() {
      // Call to show activities
      var menu = new ActionMenu(activitiesMockup, title);
      sinon.stub(menu, 'publish');
      menu.start();
      assert.ok(getMenu().classList.contains('visible'));
      assert.isTrue(menu.active);
      assert.isTrue(menu.isActive());
      assert.isTrue(menu.publish.calledWith('-activated'));
      assert.isTrue(screenElement.classList.contains('action-menu'));
      menu.stop();
    });

    test(' > open > hide', function() {
      // Call to show activities
      var menu = new ActionMenu(activitiesMockup, title);
      sinon.stub(menu, 'publish');
      menu.start();
      // Hide. Calls stop
      var stub = this.sinon.stub(menu, 'stop');
      menu.hide();
      assert.isFalse(menu.active);
      assert.isFalse(menu.isActive());
      assert.isTrue(menu.publish.calledWith('-deactivated'));
      getMenu().dispatchEvent(new CustomEvent('transitionend'));
      assert.ok(stub.calledOnce);
      stub.restore();
      menu.stop();
      assert.isFalse(screenElement.classList.contains('action-menu'));
    });
  });

  suite(' > handleEvent', function() {
    var clickEvent;
    var menu;

    setup(function() {
      resetHTML();
      menu = new ActionMenu(activitiesMockup, title);
      menu.start();
      this.sinon.spy(menu, 'handleEvent');
      this.sinon.spy(menu, 'hide');
      clickEvent = new Event('click', {
        cancelable: true,
        bubbles: true
      });
    });

    test(' > click > action', function() {
      getMenu().querySelector('menu').firstChild.dispatchEvent(clickEvent);
      assert.isTrue(menu.handleEvent.called);
      assert.isTrue(menu.hide.called);
      assert.isTrue(clickEvent.defaultPrevented);
    });

    test(' > click > cancel', function() {
      getMenu().querySelector('menu').lastChild.dispatchEvent(clickEvent);
      assert.isTrue(menu.handleEvent.called);
      assert.isTrue(menu.hide.called);
      assert.isTrue(clickEvent.defaultPrevented);
    });
  });

  suite('events that dismiss action menu', function() {
    var successCBStub;
    var cancelCBStub;
    var menu;

    setup(function() {
      resetHTML();
      successCBStub = this.sinon.spy();
      cancelCBStub = this.sinon.spy();
      menu = new ActionMenu(
        genericActionsMockup, title, successCBStub, cancelCBStub);
      menu.start();
      this.sinon.spy(menu, 'hide');
    });
    test('home event dismisses action menu', function() {
      assert.isFalse(menu.hide.called);
      assert.isFalse(cancelCBStub.called);
      menu.handleEvent({
        type: 'home'
      });
      assert.isTrue(menu.hide.called);
      assert.isTrue(cancelCBStub.called);
    });
    test('sheets-gesture-begin event dismisses action menu', function() {
      assert.isFalse(menu.hide.called);
      assert.isFalse(cancelCBStub.called);
      menu.handleEvent({
        type: 'sheets-gesture-begin'
      });
      assert.isTrue(menu.hide.called);
      assert.isTrue(cancelCBStub.called);
    });
    test('attention window dismisses the action menu', function() {
      assert.isFalse(menu.hide.called);
      assert.isFalse(cancelCBStub.called);
      menu.handleEvent({
        type: 'attentionopened'
      });
      assert.isTrue(menu.hide.called);
      assert.isTrue(cancelCBStub.called);
    });
  });

  suite(' > publish', function() {
    var menu, originalDispatchEvent, eventName = '-test_event';

    setup(function() {
      resetHTML();
      originalDispatchEvent = window.dispatchEvent;
      menu = new ActionMenu(activitiesMockup, title);
      sinon.spy(window, 'dispatchEvent');
    });

    teardown(function() {
      window.dispatchEvent = originalDispatchEvent;
    });

    test('action menu prefix added', function() {
      menu.publish(eventName);
      assert.equal(window.dispatchEvent.args[0][0].type,
        menu.EVENT_PREFIX + eventName);
    });
  });

  suite('preventFocusChange', function() {
    setup(function() {
      resetHTML();
    });

    test('focus is not changed when specified', function() {
      var menu = new ActionMenu(genericActionsMockup, title, null, null, true);
      this.sinon.spy(menu, 'preventFocusChange');
      menu.start();
      menu.menu.dispatchEvent(new CustomEvent('mousedown',
        { bubbles: true, cancelable: true }));
      assert.isTrue(menu.preventFocusChange.called);
    });
  });

  suite('askForDefaultChoice option', function() {
    var menu;

    setup(function() {
      resetHTML();
      menu = new ActionMenu(
        genericActionsMockup, title, null, null, null, true);
      menu.start();
      this.sinon.spy(menu, 'hide');
    });

    test('checkbox is created', function() {
      var checkbox = getMenu().querySelectorAll('.pack-checkbox');
      assert.equal(checkbox.length, 1);
    });
  });
});
