
'use strict';

requireApp('settings/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_download.js');
require('/shared/test/unit/mocks/mock_download_formatter.js');

require('/shared/js/download/download_ui.js');

var mocksHelperForDownloadUI = new MocksHelper([
  'LazyLoader',
  'DownloadFormatter'
]).init();

suite('DownloadUI', function() {
  var realL10n, download, dialogSelector = '#downloadConfirmUI',
      buttonsSelector = '#downloadConfirmUI button';

  mocksHelperForDownloadUI.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  setup(function() {
    download = new MockDownload();
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    download = null;
  });

  test('UI displayed twice ', function(done) {
    DownloadUI.show(DownloadUI.TYPE.STOP, download);
    this.sinon.clock.tick(0);
    assert.equal(document.querySelectorAll(dialogSelector).length, 1);
    assert.equal(document.querySelectorAll(buttonsSelector).length, 2);

    DownloadUI.show(DownloadUI.TYPE.STOP, download);
    this.sinon.clock.tick(0);
    assert.equal(document.querySelectorAll(dialogSelector).length, 1);
    assert.equal(document.querySelectorAll(buttonsSelector).length, 2);

    done();
  });
});
