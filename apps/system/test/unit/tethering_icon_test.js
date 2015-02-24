/* global TetheringIcon, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/tethering_icon.js');

require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/TetheringIcon', function() {
  var subject, manager, realL10n;

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    manager = {
      connected: false,
      enabled: false
    };
    subject = new TetheringIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  test('Tethering is enabled', function() {
    manager.enabled = true;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOn-tethering');
  });

  test('Tethering is active', function() {
    manager.enabled = true;
    manager.connected = true;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.equal(subject.element.dataset.active, 'true');
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOnActive-tethering');
  });
});
