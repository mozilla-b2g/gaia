'use strict';

requireApp('settings/test/unit/mock_l10n.js');

mocha.globals(['SimUIModel']);

suite('SimUIModel', function() {
  var realL10n;
  var fakeSimcard;
  var fakeSimcardIndex = 0;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    // because we use _, we have to make sure
    // this script is executed after requiring
    requireApp('settings/js/simcard_manager_simcard_helper.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    // create a fakeSimcard instance
    fakeSimcard = new SimUIModel(fakeSimcardIndex);
  });

  suite('SimCard.getInfo > ', function() {
    test('can getInfo successfully', function() {
      assert.isObject(fakeSimcard.getInfo());
    });
  });

  suite('SimCard.setState > ', function() {

    suite('nosim state > ', function() {
      setup(function() {
        fakeSimcard.setState('nosim');
      });

      test('set state to nosim successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isFalse(cardInfo.enabled);
        assert.isTrue(cardInfo.absent);
        assert.isFalse(cardInfo.locked);
        assert.equal(cardInfo.name, 'SIM ' + (fakeSimcardIndex + 1));
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator, 'noSimCard');
      });
    });

    suite('lock state > ', function() {
      setup(function() {
        fakeSimcard.setState('locked');
      });

      test('set state to lock successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isFalse(cardInfo.enabled);
        assert.isFalse(cardInfo.absent);
        assert.isTrue(cardInfo.locked);
        assert.equal(cardInfo.name, 'SIM ' + (fakeSimcardIndex + 1));
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator, 'sim-pin-locked');
      });
    });

    suite('normal state > ', function() {
      var fakeNumber = '0123456789';
      var fakeOperator = 'chunghwa telecom';

      setup(function() {
        fakeSimcard.setState('normal', {
          number: fakeNumber,
          operator: fakeOperator
        });
      });

      test('set state to normal successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isTrue(cardInfo.enabled);
        assert.isFalse(cardInfo.absent);
        assert.isFalse(cardInfo.locked);
        assert.equal(cardInfo.name, 'SIM ' + (fakeSimcardIndex + 1));
        assert.equal(cardInfo.number, fakeNumber);
        assert.equal(cardInfo.operator, fakeOperator);
      });
    });
  });
});
