'use strict';

suite('Achievements Template > ', function() {

  var modules = [
    'panels/achievements/achievements_template'
  ];

  var achievementsTemplate;
  var mockAchievement = {
    issuer: 'fxos-sharing',
    criteria: 'achievements/sharing-is-caring'
  };

  suiteSetup(function(done) {
    var requireCtx = testRequire([], {}, function() {});

    requireCtx(modules, function(achtemplate) {
      achievementsTemplate = achtemplate;
      done();
    });
  });

  test('achievements template rendered', function() {
    var subject = achievementsTemplate(mockAchievement);
    assert.equal(subject.tagName, 'LI');
    assert.isTrue(subject.classList.contains('achievements-item'));

    var details = subject.querySelector('.details');
    assert.ok(details);

    var span = details.querySelector('span');
    assert.ok(span);
    assert.equal(span.getAttribute('data-l10n-id'),
      'achievements-sharing-is-caring-name');

    var small = details.querySelector('small');
    assert.ok(small);
    assert.equal(small.getAttribute('data-l10n-id'),
      'achievements-sharing-is-caring-description');

    var icon = subject.querySelector('img');
    assert.ok(icon);
    assert.isTrue(icon.classList.contains('icon'));
    assert.isTrue(icon.src.indexOf('sharing-is-caring') > 0);
  });
});
