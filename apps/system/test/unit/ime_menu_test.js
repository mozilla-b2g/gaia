'use strict';

/* global ImeMenu, MocksHelper, Event */

requireApp('system/js/ime_menu.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/shared/js/tagged.js');

var mocksForAppInstallManager = new MocksHelper([
  'LazyLoader'
]).init();

suite('ImeMenu', function() {
  var imeListMockup = [
    {
      value: 0,
      layoutName: 'Test Layout 1',
      appName: 'test app 1'
    },
    {
      value: 1,
      layoutName: 'Test Layout 2',
      appName: 'test app 1',
      selected: true
    }
  ];

  var newImeListMockup = [
    {
      value: 0,
      layoutName: 'New Test Layout 1',
      appName: 'test app 1'
    },
    {
      value: 1,
      layoutName: 'New Test Layout 2',
      appName: 'test app 1'
    },
    {
      value: 2,
      layoutName: 'New Test Layout 3',
      appName: 'test app 2',
      selected: true
    }
  ];

  var title = 'Test Layout Menu';
  var screenElement;

  mocksForAppInstallManager.attachTestHelpers();

  function getMenu() {
    return screenElement.querySelector('.ime-menu');
  }

  /*
   * Check each ime item in the menu matches the data we passed.
   */
  function checkImeItems(imeListContainer, imeList) {
    var i = 0;
    var layoutNameElement = null;
    var appNameElement = null;

    for (i = 0; i < imeListContainer.length; i++) {
      layoutNameElement = imeListContainer[i].querySelector('.item-label');
      appNameElement = imeListContainer[i].querySelector('.item-note');

      assert.equal(layoutNameElement.textContent,
                   imeList[i].layoutName);

      assert.equal(appNameElement.textContent, imeList[i].appName);
    }
  }

  suiteSetup(function() {
    loadBodyHTML('/index.html');
    screenElement = document.getElementById('screen');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  suite(' > Structure & Basic methods', function() {
    test(' > start()', function() {
      // We must have *only* one action menu in system
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();

      // We should have only one 'action' menu in system
      var imeMenus = screenElement.querySelectorAll('.ime-menu');
      assert.equal(imeMenus.length, 1);

      var imeMenu = imeMenus[0];

      // Check header
      var sections = imeMenu.getElementsByTagName('section');
      assert.equal(sections.length, 1);

      var headers = sections[0].getElementsByTagName('h1');
      assert.equal(headers.length, 1);

      // Check button menu
      var menus = imeMenu.getElementsByTagName('menu');
      assert.equal(menus.length, 1);

      menu.stop();
    });

    test(' > check title', function() {
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();
      assert.equal(
        getMenu().querySelector('section > h1').getAttribute('data-l10n-id'),
        title);
      menu.stop();
    });

    test(' > check ime list', function() {
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();

      var imeItems = getMenu().querySelectorAll('.ime-menu-list li');
      assert.equal(imeItems.length, imeListMockup.length);

      // Check the selected item is correct
      var selectedItem = getMenu().querySelector('li[aria-selected="true"]');
      assert.equal(selectedItem.dataset.id, '1');

      menu.stop();
    });

    test(' > check each item in the ime list', function() {
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();

      var imeItems = getMenu().querySelectorAll('.ime-menu-list li');
      assert.equal(imeItems.length, imeListMockup.length);
      checkImeItems(imeItems, imeListMockup);

      menu.stop();
    });

    test(' > renew ime list', function() {
      // Show menu 1
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();

      var imeItems = getMenu().querySelectorAll('.ime-menu-list li');
      assert.equal(imeItems.length, imeListMockup.length);

      // Check the selected item is correct
      var selectedItem = getMenu().querySelector('li[aria-selected="true"]');
      assert.equal(selectedItem.dataset.id, '1');

      menu.stop();

      // Show menu 2
      var menu2 = new ImeMenu(newImeListMockup, title);
      menu2.start();

      imeItems = getMenu().querySelectorAll('.ime-menu-list li');
      assert.equal(imeItems.length, newImeListMockup.length);

      // Check the selected item is correct
      selectedItem = getMenu().querySelector('li[aria-selected="true"]');
      assert.equal(selectedItem.dataset.id, '2');

      checkImeItems(imeItems, newImeListMockup);

      menu2.stop();
    });

    test(' > start > hide', function() {
      var menu = new ImeMenu(imeListMockup, title);
      menu.start();

      // Hide -> stop() will be called
      var spy = this.sinon.spy(menu, 'stop');
      menu.hide();
      assert.ok(spy.calledOnce);
    });
  });

  suite(' > handleEvent', function() {
    var menu;
    var clickEvent;

    setup(function() {
      menu = new ImeMenu(imeListMockup, title);
      menu.start();
      this.sinon.spy(menu, 'handleEvent');
      this.sinon.spy(menu, 'hide');
      this.sinon.spy(menu, 'oncancel');
      this.sinon.spy(menu, 'launchSettings');
      clickEvent = new Event('click', {
        cancelable: true,
        bubbles: true
      });
    });

    test(' > click > ime item', function(done) {
      this.sinon.stub(menu, 'onselected', function() {
        assert.isTrue(menu.onselected.called);
        assert.isTrue(menu.onselected.calledWith(0));
        done();
      });

      var element = getMenu().querySelector('.ime-menu-list').firstElementChild;
      element.dispatchEvent(clickEvent);
      assert.isTrue(menu.handleEvent.called);
      assert.isTrue(menu.hide.called);
      assert.isTrue(clickEvent.defaultPrevented);
    });

    test(' > click > cancel', function() {
      var element = getMenu().querySelector('[data-action="cancel"]');
      element.dispatchEvent(clickEvent);
      assert.isTrue(menu.handleEvent.called);
      assert.isTrue(menu.hide.called);
      assert.isTrue(menu.oncancel.called);
    });
  });
});
