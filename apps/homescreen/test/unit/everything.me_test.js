'use strict';

require('/shared/js/lazy_loader.js');

requireApp('homescreen/test/unit/mock_everything.me.html.js');
requireApp('homescreen/test/unit/mock_asyncStorage.js');
requireApp('homescreen/test/unit/mock_l10n.js');
requireApp('homescreen/everything.me/js/everything.me.js');

if (!this.asyncStorage) {
  this.asyncStorage = null;
}

suite('everything.me.js >', function() {
  var wrapperNode,
      realAsyncStorage;

  suiteSetup(function() {
    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockEverythingMeHtml;
    document.body.appendChild(wrapperNode);

    EverythingME.init();
  });

  suiteTeardown(function() {
    window.asyncStorage = realAsyncStorage;

    document.body.removeChild(wrapperNode);
  });

  suite('Everything.me starts initialization correctly >', function() {
    test('Ev.me page is loading >', function() {
      assert.isFalse(document.body.classList.contains('evme-loading'));
      EverythingME.activate();
      assert.isTrue(document.body.classList.contains('evme-loading'));
    });
  });

  test('Everything.me migration successful >', function(done) {
    // save localStorge values to restore after the test is complete
    var originalHistory = localStorage['userHistory'],
        originalShortcuts = localStorage['localShortcuts'],
        originalIcons = localStorage['localShortcutsIcons'];

    localStorage['userHistory'] = 'no json, should give error but continue';
    localStorage['localShortcuts'] = '{"_v": "shortcuts json with value"}';
    localStorage['localShortcutsIcons'] = '{"_v": "icons json with value"}';

    EverythingME.migrateStorage(function migrationDone() {
      // first test that the localStorage items were removed
      assert.isTrue(!localStorage['userHistory'] &&
                    !localStorage['localShortcuts'] &&
                    !localStorage['localShortcutsIcons']);

      // restore original localStorage values
      localStorage['userHistory'] = originalHistory;
      localStorage['localShortcuts'] = originalShortcuts;
      localStorage['localShortcutsIcons'] = originalIcons;

      window.asyncStorage.getItem('evme-localShortcuts', function got(val) {
        // then that they were actually copied to the IndexedDB
        assert.isTrue(!!(val && val.value));

        done();
      });
    }, true); // force migration even if already done by EverythingME.init()
  });

  suite('Everything.me will be destroyed >', function() {

    test('All e.me css/script should be deleted from the DOM >', function() {
      EverythingME.destroy();
      assert.equal(document.querySelectorAll('head > [href*="everything.me"]').
                   length, 0);
    });

  });

});
