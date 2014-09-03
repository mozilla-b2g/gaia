'use strict';

/* global loadBodyHTML, sinon */

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Browsing Privacy >', function() {
  var browsingPrivacyPanel;
  var MockBrowsingPrivacy = {
    clearBookmarksData: sinon.spy(),
    clearPrivateData: sinon.spy(),
    clearHistory: sinon.spy()
  };

  var clearDialog, clearDialogOk;

  suiteSetup(function(done) {
    var map = {
      '*': {
        'panels/browsing_privacy/browsing_privacy': 'MockBrowsingPrivacy'
      }
    };

    var modules = [
      'panels/browsing_privacy/panel',
      'MockBrowsingPrivacy'
    ];

    var requireCtx = testRequire([], map, function() {});
    define('MockBrowsingPrivacy', function() {
      return function() {
        return MockBrowsingPrivacy;
      };
    });

    loadBodyHTML('_browsing_privacy.html');

    clearDialog = document.body.querySelector('.clear-dialog');
    clearDialogOk = document.body.querySelector('.clear-dialog-ok');

    requireCtx(modules, function(BrowsingPrivacyPanel) {
      browsingPrivacyPanel = BrowsingPrivacyPanel();
      browsingPrivacyPanel.init(document.body);

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
      assert.isTrue(MockBrowsingPrivacy[expectedFunction].called,
        expectedFunction + ' should be called');
    };
  }
});

