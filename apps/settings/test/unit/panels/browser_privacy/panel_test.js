'use strict';

/* global loadBodyHTML, sinon */

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Browser Privacy >', function() {
  var browserPrivacyPanel;
  var MockBrowserPrivacy = {
    clearBookmarksData: sinon.spy(),
    clearPrivateData: sinon.spy(),
    clearHistory: sinon.spy()
  };

  var clearDialog, clearDialogOk;

  suiteSetup(function(done) {
    var map = {
      '*': {
        'panels/browser_privacy/browser_privacy': 'MockBrowserPrivacy'
      }
    };

    var modules = [
      'panels/browser_privacy/panel',
      'MockBrowserPrivacy'
    ];

    var requireCtx = testRequire([], map, function() {});
    define('MockBrowserPrivacy', function() {
      return function() {
        return MockBrowserPrivacy;
      };
    });

    loadBodyHTML('_browser_privacy.html');

    clearDialog = document.body.querySelector('.clear-dialog');
    clearDialogOk = document.body.querySelector('.clear-dialog-ok');

    requireCtx(modules, function(BrowserPrivacyPanel) {
      browserPrivacyPanel = BrowserPrivacyPanel();
      browserPrivacyPanel.init(document.body);

      done();
    });
  });

  suite('confirmation dialogs >', function() {
    test(
      'clear history dialog sets setting after confirm',
      makeClickButtonTest(
        '.clear-history-button',
        'clearHistory'
      )
    );

    test(
      'clear private data dialog sets setting after confirm',
      makeClickButtonTest(
        '.clear-private-data-button',
        'clearPrivateData'
      )
    );

    test(
      'clear bookmarks dialog sets setting after confirm',
      makeClickButtonTest(
        '.clear-bookmarks-data-button',
        'clearBookmarksData'
      )
    );
  });

  function makeClickButtonTest(buttonId, expectedFunction) {
    return function() {
      document.body.querySelector(buttonId).click();
      assert.equal(clearDialog.hidden, false,
        'Clicking dangerous button should display danger dialog');
      clearDialogOk.click();
      assert.isTrue(MockBrowserPrivacy[expectedFunction].called,
        expectedFunction + ' should be called');
    };
  }
});

