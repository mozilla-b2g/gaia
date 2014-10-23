'use strict';
/* global MocksHelper, MockLock, MockSettingsListener,
          AccessibilityQuicknavMenu */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/accessibility_quicknav_menu.js');

var mocksForA11yQuicknavMenu = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/AccessibilityQuicknavMenu', function() {
  var screenNode;
  var quicknavMenu;
  mocksForA11yQuicknavMenu.attachTestHelpers();

  setup(function() {
    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    document.body.appendChild(screenNode);
    quicknavMenu = new AccessibilityQuicknavMenu();
  });

  teardown(function() {
    screenNode.parentNode.removeChild(screenNode);
  });

  test('correct modes are available', function() {
    var modes = ['Link', 'Button', 'Landmark', 'FormControl'];
    MockSettingsListener.mCallbacks[
      'accessibility.screenreader_quicknav_modes'](modes.join(','));
    var items = quicknavMenu.element.querySelectorAll('li');
    assert.equal(items.length, 4);
    for (var i=0; i < items.length; i++) {
      var span = items[i].querySelector('span');
      assert.equal(span.dataset.l10nId, 'accessibility-quicknav_' + modes[i]);
    }
  });

  test('correct mode is selected', function() {
    quicknavMenu.updateModes(['Link', 'Button', 'Landmark']);
    MockSettingsListener.mCallbacks[
      'accessibility.screenreader_quicknav_index'](1);
    var selected = quicknavMenu.element.querySelectorAll(
      'li[aria-selected=true]');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].dataset.quicknavIndex, '1');
  });

  test('select quicknavMenu mode', function() {
    quicknavMenu.updateModes(['Link', 'Button', 'Landmark']);
    quicknavMenu.show();

    // Check that menu actually shows up.
    assert.isTrue(quicknavMenu.element.classList.contains('visible'));
    MockLock.clear();

    // Click on the item with quicknavMenu index 2.
    var event = new MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });
    quicknavMenu.element.querySelector(
      'li[data-quicknav-index="2"]').dispatchEvent(event);

    // Check that correct setting is set after click.
    assert.equal(
      MockLock.locks.shift()['accessibility.screenreader_quicknav_index'], 2);

    // Check that menu goes away.
    assert.isFalse(quicknavMenu.element.classList.contains('visible'));
  });
});
