'use strict';

/* globals MockMozApps, MockL10n */

require('/shared/test/unit/mocks/mock_l20n.js');
require('mock_moz_apps.js');

suite('Addon Details Test > ', function() {

  var modules = [
    'panels/addon_details/addon_details',
    'shared_mocks/mock_manifest_helper',
    'unit/mock_addon_manager'
  ];
  var map = {
    '*': {
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
      'modules/addon_manager': 'unit/mock_addon_manager'
    }
  };
  var MockAddon = {
    observe: sinon.stub(),
    unobserve: sinon.stub(),
    instance: {
      manifest: {}
    }
  };
  var MockObsoleteAddon = Object.assign({}, MockAddon, {
    instance: { manifest: { customizations: [] } }
  });
  var MockObsoleteRemovableAddon = Object.assign({}, MockAddon, {
    instance: { manifest: { customizations: [] }, removable: true }
  });

  var realL10n, realMozApps, subject;

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    realL10n = document.l10n;
    document.l10n = MockL10n;
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockMozApps;

    requireCtx(modules, (AddonDetails, MockManifestHelper,
      MockAddonManager) => {
      subject = AddonDetails({
        body: document.createElement('div'),
        header: document.createElement('div'),
        enabledState: document.createElement('div'),
        name: document.createElement('div'),
        icon: document.createElement('div'),
        version: document.createElement('div'),
        description: document.createElement('div'),
        developer: document.createElement('div'),
        targetsList: document.createElement('div'),
        obsoleteStatus: document.createElement('div'),
        obsoleteStatusInfo: document.createElement('div')
      });
      done();
    });
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
    realL10n = null;
    navigator.mozApps = realMozApps;
    realMozApps = null;
  });

  suite('render > obsoleteStatus', function() {
    test('hidden', function() {
      subject.render(MockAddon);
      assert.isTrue(subject._elements.obsoleteStatus.hidden);
    });

    test('visible', function() {
      subject.render(MockObsoleteAddon);
      assert.isFalse(subject._elements.obsoleteStatus.hidden);
      assert.equal(
        subject._elements.obsoleteStatusInfo.getAttribute('data-l10n-id'),
        'addon-obsolete');
    });

    test('visible can delete', function() {
      subject.render(MockObsoleteRemovableAddon);
      assert.isFalse(subject._elements.obsoleteStatus.hidden);
      assert.equal(
        subject._elements.obsoleteStatusInfo.getAttribute('data-l10n-id'),
        'addon-obsolete-can-delete');
    });
  });
});
