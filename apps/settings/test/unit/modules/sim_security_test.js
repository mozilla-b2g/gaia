suite('SimSecurity', function() {
  'use strict';

  var simSecurity;

  setup(function(done) {
    testRequire([
      'modules/sim_security'
    ], {}, function(SimSecurity) {
      simSecurity = SimSecurity;
      simSecurity._getIccByCardIndex = function(cardIndex) {
        var func = function() {
          return Promise.resolve();
        };
        return {
          unlockCardLock: func,
          setCardLock: func,
          updateContact: func,
          getCardLock: func,
          getCardLockRetryCount: func
        };
      };
      done();
    });
  });


  ['pin', 'pin2', 'fdn'].forEach(function(lockType) {
    [true, false].forEach(function(enabled) {
      var fakeCardIndex = 0;
      var status = enabled ? 'enabled' : 'disabled';
      var eventName = lockType + '-' + status;
      test(eventName + ' works', function(done) {
        simSecurity.addEventListener(eventName, function(evt) {
          var cardIndex = evt.detail;
          assert.equal(cardIndex, fakeCardIndex);
          done();
        });

        var apiName = enabled ? 'setCardLock' : 'unlockCardLock';
        simSecurity[apiName](fakeCardIndex, {
          lockType: lockType,
          pin: '1234',
          enabled: enabled
        });
      });
    });
  });

  ['pin', 'pin2'].forEach(function(lockType) {
    var fakeCardIndex = 0;
    var eventName = lockType + '-changed';

    test(eventName + ' works', function(done) {
      simSecurity.addEventListener(eventName, function(evt) {
        var cardIndex = evt.detail;
        assert.equal(cardIndex, fakeCardIndex);
        done();
      });

      simSecurity.setCardLock(fakeCardIndex, {
        lockType: lockType,
        pin: '1234',
        newPin: '0000'
      });
    });
  });
});
