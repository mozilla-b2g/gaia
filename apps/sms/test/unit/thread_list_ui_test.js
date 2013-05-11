'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert'] });

requireApp('sms/js/utils.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/thread_list_ui.js');

requireApp('sms/test/unit/mock_fixed_header.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');

var mocksHelperForThreadListUI = new MocksHelper([
  'Utils',
  'FixedHeader'
]).init();

suite('thread_list_ui', function() {
  var nativeMozL10n = navigator.mozL10n;

  mocksHelperForThreadListUI.attachTestHelpers();
  suiteSetup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    ThreadListUI.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  suite('delayed rendering loops', function() {

    suite('multiple render calls', function() {
      var appendThread;
      var appendCallCount;

      suiteSetup(function() {
        appendThread = ThreadListUI.appendThread;
        ThreadListUI.appendThread = function(thread) {
          appendCallCount++;
          assert.ok(thread.okay);
        };
      });

      suiteTeardown(function() {
        ThreadListUI.appendThread = appendThread;
      });

      setup(function() {
        appendCallCount = 0;
      });


      test('second render aborts first', function(done) {
        ThreadListUI.renderThreads([{},{}], function() {
          // this should not be called
          assert.ok(false);
        });
        ThreadListUI.renderThreads([{}], function() {
          // this should not be called
          assert.ok(false);
        });
        // only the last render should complete
        ThreadListUI.renderThreads([{okay: true},{okay: true}], function() {
          assert.ok(true);
          assert.equal(appendCallCount, 2);
          done();
        });
      });

    });

  });

});
