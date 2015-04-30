/*global MocksHelper, MockL10n, MockSettingsListener, MockSystemBanner,
         MockNavigatorSettings, CrashReporter */
/*exported MockSettingsListener */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_system_banner.js');

var _HTML = `
<div id="crash-dialog">
  <form role="dialog" class="generic-dialog" data-type="confirm">
    <section id="crash-dialog-contents">
      <h1 id="crash-dialog-title"></h1>
      <p data-l10n-id="crash-dialog-message"></p>
      <p><a id="crash-info-link" data-l10n-id="crash-info-link"></a></p>
      <p>
        <input id="always-send" type="checkbox" checked="true" />
        <label for="always-send" data-l10n-id="crash-always-report"></label>
      <p>
    </section>
    <menu data-items="2">
      <button id="dont-send-report"
              disabled="true"
              data-l10n-id="crash-dont-send"></button>
      <button id="send-report"
              class="recommend"
              data-l10n-id="crash-end"></button>
    </menu>
  </form>
  <section role="region">
    <gaia-header id="crash-reports-header" action="close">
      <h1 data-l10n-id="crashReports"></h1>
    </gaia-header>
    <div>
      <ul>
        <li class="description" data-l10n-id="crash-reports-description-1"></li>
        <li class="description" data-l10n-id="crash-reports-description-2"></li>
        <li class="description">
          <span data-l10n-id="crash-reports-description-3-start"></span>
          <span data-l10n-id="crash-reports-description-3-privacy"></span>
          <span data-l10n-id="crash-reports-description-3-end"></span>
        </li>
      </ul>
    </div>
  </section>
</div>
`;

var TICK = 1000;
var mocksForCrashReporter = new MocksHelper(['SettingsListener',
                                             'SystemBanner',
                                             'LazyLoader']);

suite('system/CrashReporter', function() {
  var app, clock, screen, dialog, realL10n, realMozSettings, spyL10n;

  mocksForCrashReporter.attachTestHelpers();
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    document.body = document.createElement('body');

    screen = document.createElement('div');
    screen.id = 'screen';
    screen.innerHTML = _HTML;

    document.body.appendChild(screen);
    dialog = document.getElementById('crash-dialog');

    app = { isActive: function() { return true; }, name: null };

    clock = this.sinon.useFakeTimers();
    spyL10n = this.sinon.spy(MockL10n, 'get');

    requireApp('system/js/crash_reporter.js', done);
  });

  teardown(function() {
    clock.restore();
    spyL10n.restore();

    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();

    document.body.removeChild(screen);

    app = null;
    screen = null;
    dialog = null;
  });

  test('should handle null app names in dialog', function() {
    CrashReporter.handleAppCrash(
      new CustomEvent('appcrashed', { 'detail': app })
    );

    CrashReporter.handleCrash(0, false);
    clock.tick(TICK);

    assert.isTrue(screen.classList.contains('crash-dialog'));
    assert.isTrue(spyL10n.calledWith('crash-dialog-app-noname'));
  });

  test('should handle null app names in banner', function() {
    // Show the banner instead of the dialog this time.
    MockNavigatorSettings.mSettings['crashReporter.dialogShown'] = true;

    CrashReporter.handleAppCrash(
      new CustomEvent('appcrashed', { 'detail': app })
    );

    CrashReporter.handleCrash(0, false);
    clock.tick(TICK);

    assert.equal(MockSystemBanner.mShowCount, 1);
    assert.isTrue(
      MockSystemBanner.mMessage.contains('crash-dialog-app-noname')
    );
  });
});
