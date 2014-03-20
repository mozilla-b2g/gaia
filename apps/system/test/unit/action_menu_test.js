'use strict';
/* global ActionMenu, Event, MockL10n */

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/js/action_menu.js');
requireApp('system/test/unit/mock_l10n.js');

suite('ActionMenu', function() {
  var activitiesMockup, realL10n, genericActionsMockup;
  var iconUrl = 'images/icon.png', title = 'Title';
  var screenElement;

  function getMenu() {
    return screenElement.querySelector('[data-type="action"]');
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
    loadBodyHTML('/index.html');
    screenElement = document.getElementById('screen');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });


  suite(' > Structure & Basic methods', function() {
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
      assert.equal(getMenu().querySelector('header').textContent, title);
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
      menu.start();
      assert.ok(getMenu().classList.contains('visible'));
      menu.stop();
    });

    test(' > open > hide', function() {
      // Call to show activities
      var menu = new ActionMenu(activitiesMockup, title);
      menu.start();
      // Hide. Calls stop
      var stub = this.sinon.stub(menu, 'stop');
      menu.hide();
      assert.ok(stub.calledOnce);
      stub.restore();
      menu.stop();
    });

  });

  suite(' > handleEvent', function() {
    var clickEvent;
    var menu;

    setup(function() {
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

  suite('events', function() {
    test('attentionscreenshow hides the action menu', function() {
      var menu = new ActionMenu(genericActionsMockup, title);
      menu.start();
      this.sinon.spy(menu, 'hide');
      menu.handleEvent({
        type: 'attentionscreenshow'
      });
      assert.isTrue(menu.hide.called);
    });
  });

  suite('preventFocusChange', function() {
    test('focus is not changed when specified', function() {
      var menu = new ActionMenu(genericActionsMockup, title, null, null, true);
      this.sinon.spy(menu, 'preventFocusChange');
      menu.start();
      menu.menu.dispatchEvent(new CustomEvent('mousedown',
        { bubbles: true, cancelable: true }));
      assert.isTrue(menu.preventFocusChange.called);
    });
  });
});
