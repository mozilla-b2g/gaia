requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/facebook/test/unit/mock_curtain.js');
requireApp('communications/contacts/js/fb/fb_query.js');
requireApp('communications/contacts/js/fb/fb_import.js');

// We're going to swap those with mock objects
// so we need to make sure they are defined.
if (!this.fb) {
  this.fb = null;
}

suite('Facebook Import', function() {
  var MockFriend,
      realFb,
      realL10n,
      subject;

  suiteSetup(function() {
    subject = fb.importer;
    // Forcing FTU as context
    subject.getContext = function() {
      return 'ftu';
    }

    realFb = window.fb;
    window.fb = MockFb;
    window.fb.utils = realFb.utils;

    MockFriend = {
      uid: '220439',
      name: 'Bret Taylor',
      first_name: 'Bret',
      last_name: 'Taylor'
    };

  });

  suiteTeardown(function() {
    window.fb = realFb;

    MockFb.savedData = [];

    window.navigator.mozL10n = window.realL10n;
  });

  test('Timeout while getting FB Photo', function(done) {

    window.fb.operationsTimeout = 10;

    subject.setSelected([MockFriend]);

    subject.imgTimeoutHandler = function() {
      assert.ok(true, 'Timeout handler was invoked!');
    }

    subject.errorHandler = function() {
      assert.error('Error while getting Fb data');
    }

    subject.importAll(function() {
      assert.isTrue((fb.savedData.length === 1), 'Checking data importation');

      assert.isTrue(typeof fb.savedData[0].photo === 'undefined',
                    'Checking that no photo was saved');
      done();
    });
  });

});
