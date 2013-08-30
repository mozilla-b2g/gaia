'use strict';

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

  suite('Everything.me is initialized correctly >', function() {

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
    });
  });

  suite('Everything.me is displayed >', function() {

    EverythingME.activate();

    test('Ev.me page is loaded >', function() {
      assert.isTrue(EverythingME.displayed);
    });
  });

  suite('Everything.me is hidden >', function() {

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
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
    });
  });

  suite('Everything.me will be destroyed >', function() {

    test('All e.me css/script should be deleted from the DOM >', function() {
      EverythingME.destroy();
      assert.equal(document.querySelectorAll('head > [href*="everything.me"]').
                   length, 0);
    });

  });

});
