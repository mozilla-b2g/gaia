'use strict';

/* global AchievementsService, MockNavigatorSettings */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/achievements-service.js');

suite('Achievements Service', function() {

  var mockAchievement = {
    criteria: 'achievements/achievement',
    evidence: 'urn:achievement:achieved',
    name: 'Achievement',
    description: 'Achievement description',
    image: '/style/icons/Blank.png'
  };

  var achievementsService, realMozSettings, realNotification;

  setup(function() {
    achievementsService = new AchievementsService();

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realNotification = window.Notification;
    window.Notification = sinon.spy();

    navigator.mozSettings.createLock().set({
      achievements: [{
        criteria: 'achievements/achievement',
        issuer: 'achievements_service_test'
      }]
    });
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    window.Notification = realNotification;
  });

  test('reward', function(done) {
    achievementsService.reward(mockAchievement).then(function() {
      var notification = window.Notification.args[0][1];
      var issuesOn = notification.tag;
      var achievement = navigator.mozSettings.createLock().get(
        'achievements').result.achievements[0];

      sinon.assert.calledOnce(window.Notification);
      assert.isTrue(window.Notification.calledWith(mockAchievement.name));
      assert.equal(notification.body, mockAchievement.description);
      assert.ok(issuesOn);
      assert.equal(notification.icon.indexOf('data:image/png'), 0);

      assert.equal(achievement.criteria, mockAchievement.criteria);
      assert.equal(achievement.evidence, mockAchievement.evidence);
      assert.equal(achievement.issuedOn, issuesOn);
      assert.ok(achievement.recipient);
      assert.equal(achievement.uid.indexOf('achievement'), 0);
      done();
    });
  });

});
