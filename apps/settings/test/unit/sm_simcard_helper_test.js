'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/js/simcard_manager_simcard_helper.js');

suite('Simcard >', function() {
  var realL10n;
  var fakeSimcard;
  var fakeSimcardIndex = 0;

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    // create a fakeSimcard instance
    fakeSimcard = new SimCard(fakeSimcardIndex);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
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
        assert.isTrue(cardInfo.enabled);
        assert.isTrue(cardInfo.absent);
        assert.isFalse(cardInfo.locked);
        assert.equal(cardInfo.name, 'noSimCard');
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator, '');
      });
    });

    suite('lock state > ', function() {
      setup(function() {
        fakeSimcard.setState('lock');
      });

      test('set state to lock successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isTrue(cardInfo.enabled);
        assert.isFalse(cardInfo.absent);
        assert.isTrue(cardInfo.locked);
        assert.equal(cardInfo.name, 'simcard' + (fakeSimcardIndex + 1));
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator, '');
      });
    });

    suite('normal state > ', function() {
      var fakeLockState = true;
      var fakeNumber = '0123456789';
      var fakeOperator = 'chunghwa telecom';

      setup(function() {
        fakeSimcard.setState('normal', {
          locked: fakeLockState,
          number: fakeNumber,
          operator: fakeOperator
        });
      });

      test('set state to normal successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isTrue(cardInfo.enabled);
        assert.isFalse(cardInfo.absent);
        assert.isTrue(cardInfo.locked);
        assert.equal(cardInfo.name, 'simcard' + (fakeSimcardIndex + 1));
        assert.equal(cardInfo.number, fakeNumber);
        assert.equal(cardInfo.operator, fakeOperator);
      });
    });

    suite('enable state > ', function() {
      setup(function() {
        fakeSimcard.setState('enabled');
      });

      test('set state to normal successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isTrue(cardInfo.enabled);
      });
    });

    suite('disabled state > ', function() {
      setup(function() {
        fakeSimcard.setState('disabled');
      });

      test('set state to normal successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isFalse(cardInfo.enabled);
      });
    });
  });
});
