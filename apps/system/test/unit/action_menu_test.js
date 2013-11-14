'use strict';

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/js/action_menu.js');
requireApp('system/test/unit/mock_l10n.js');

suite('ActionMenu', function() {
  var activitiesMockup, realL10n, genericActionsMockup;
  var iconUrl = 'images/icon.png', title = 'Title';
  var actionMenu, screenElement;

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
    ActionMenu.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });




  suite(' > Structure & Basic methods', function() {
    setup(function() {
      actionMenu = screenElement.querySelector('[data-type="action"]');
    });

    teardown(function() {
      actionMenu = null;
    });
    test(' > init', function() {
      // We must have *only* one action menu in system

      // We should have only one 'action' menu in system
      var actionMenus = screenElement.querySelectorAll('[data-type="action"]');
      assert.equal(actionMenus.length, 1);

      // Check header
      var headers = actionMenu.getElementsByTagName('header');
      assert.equal(headers.length, 1);

      // Check menu
      var menus = actionMenu.getElementsByTagName('menu');
      assert.equal(menus.length, 1);
    });

    test(' > setTitle', function() {
      ActionMenu.open(activitiesMockup, title);
      assert.equal(actionMenu.querySelector('header').textContent, title);
    });

    test(' > open > activities', function() {
      // Activities have their own icons
      ActionMenu.open(activitiesMockup, title);
      var actions = actionMenu.getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, activitiesMockup.length + 1);
      // We need only icons in the actions, not in the cancel
      var icons = actionMenu.getElementsByClassName('icon');
      assert.equal(icons.length, activitiesMockup.length);
    });

    test(' > open > buildMenu', function() {
      // Call to show activities
      ActionMenu.open(activitiesMockup, title);
      var actions = actionMenu.getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, activitiesMockup.length + 1);
      // Call to show other activities
      ActionMenu.open(genericActionsMockup);
      // Now the layout should be clean and with a new number of options
      var actions = actionMenu.getElementsByTagName('button');
      // We check that actions.length + cancel button are
      // the same number of items than expected.
      assert.equal(actions.length, genericActionsMockup.length + 1);
    });

    test(' > open > show', function() {
      // Call to show activities
      ActionMenu.open(activitiesMockup, title);
      assert.ok(actionMenu.classList.contains('visible'));
    });

    test(' > open > hide', function() {
      // Call to show activities
      ActionMenu.open(activitiesMockup, title);
      // Hide. Class visible should be removed
      ActionMenu.hide();
      assert.isFalse(actionMenu.classList.contains('visible'));
    });

  });

  suite(' > handleEvent', function() {
    var clickEvent;
    setup(function() {
      actionMenu = screenElement.querySelector('[data-type="action"]');
      ActionMenu.open(activitiesMockup, title);
      this.sinon.spy(ActionMenu, 'handleEvent');
      this.sinon.spy(ActionMenu, 'hide');
      clickEvent = new Event('click', {
        cancelable: true,
        bubbles: true
      });
    });

    teardown(function() {
      actionMenu = null;
    });

    test(' > click > action', function() {
      actionMenu.querySelector('menu').firstChild.dispatchEvent(clickEvent);
      assert.isTrue(ActionMenu.handleEvent.called);
      assert.isTrue(ActionMenu.hide.called);
      assert.isTrue(clickEvent.defaultPrevented);
    });

    test(' > click > cancel', function() {
      actionMenu.querySelector('menu').lastChild.dispatchEvent(clickEvent);
      assert.isTrue(ActionMenu.handleEvent.called);
      assert.isTrue(ActionMenu.hide.called);
      assert.isTrue(clickEvent.defaultPrevented);
    });
  });
});
