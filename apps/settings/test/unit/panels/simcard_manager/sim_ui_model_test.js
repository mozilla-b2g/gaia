/* global MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');

suite('SimUIModel', function() {
  var realL10n;
  var fakeSimcard;
  var fakeSimcardIndex = 0;

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function(done) {
    testRequire([
      'panels/simcard_manager/sim_ui_model'
    ], {}, function(SimUIModel) {
      fakeSimcard = SimUIModel(fakeSimcardIndex);
      done();
    });
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
        assert.equal(cardInfo.name.id, 'simWithIndex');
        assert.equal(cardInfo.name.args.index, fakeSimcardIndex + 1);
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator.id, 'noSimCard');
      });
    });

    suite('locked state > ', function() {
      setup(function() {
        fakeSimcard.setState('locked');
      });

      test('set state to lock successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isFalse(cardInfo.enabled);
        assert.isFalse(cardInfo.absent);
        assert.isTrue(cardInfo.locked);
        assert.equal(cardInfo.name.id, 'simWithIndex');
        assert.equal(cardInfo.name.args.index, fakeSimcardIndex + 1);
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator.id, 'sim-pin-locked');
      });
    });

    suite('blocked state > ', function() {
      setup(function() {
        fakeSimcard.setState('blocked');
      });

      test('set state to blocked successfully', function() {
        var cardInfo = fakeSimcard.getInfo();
        assert.isTrue(cardInfo.enabled);
        assert.isTrue(cardInfo.absent);
        assert.isFalse(cardInfo.locked);
        assert.equal(cardInfo.name.id, 'noSimCard');
        assert.equal(cardInfo.number, '');
        assert.equal(cardInfo.operator, null);
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
        assert.equal(cardInfo.name.id, 'simWithIndex');
        assert.equal(cardInfo.name.args.index, fakeSimcardIndex + 1);
        assert.equal(cardInfo.number, fakeNumber);
        assert.equal(cardInfo.operator.text, fakeOperator);
      });
    });
  });
});
