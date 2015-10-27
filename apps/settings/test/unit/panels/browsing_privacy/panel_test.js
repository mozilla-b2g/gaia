/* global loadBodyHTML, sinon */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('Browsing Privacy >', function() {
  var browsingPrivacyPanel;
  var MockBrowsingPrivacy = {
    clearPrivateData: sinon.spy(),
    clearHistory: sinon.spy()
  };

  suiteSetup(function(done) {
    var map = {
      '*': {
        'panels/browsing_privacy/browsing_privacy': 'MockBrowsingPrivacy',
        'modules/dialog_service': 'MockDialogService'
      }
    };

    var modules = [
      'panels/browsing_privacy/panel',
      'MockBrowsingPrivacy',
      'MockDialogService'
    ];

    var requireCtx = testRequire([], map, function() {});
    define('MockBrowsingPrivacy', function() {
      return function() {
        return MockBrowsingPrivacy;
      };
    });
    define('MockDialogService', function() {
      return {
        confirm: function() {
          return Promise.resolve({
            type: 'submit'
          });
        }
      };
    });

    loadBodyHTML('_browsing_privacy.html');

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
  });

  function makeClickButtonTest(buttonId, expectedFunction) {
    return function() {
      document.body.querySelector(buttonId).click();

      setTimeout(() => {
        assert.isTrue(MockBrowsingPrivacy[expectedFunction].called,
        expectedFunction + ' should be called');
      }, 0);
    };
  }
});
