define(["exports", "fxos-achievements-service/dist/achievements-service", "app/js/services/broadcast_service"], function (exports, _fxosAchievementsServiceDistAchievementsService, _appJsServicesBroadcastService) {
  "use strict";

  var AchievementsService = _fxosAchievementsServiceDistAchievementsService["default"];
  var BroadcastService = _appJsServicesBroadcastService["default"];


  var ACHIEVEMENT_CRITERIA = "/enable_sharing.html";
  var EVIDENCE = "urn:sharing:p2p_broadcast:true";

  var AchievementsServiceWrapper = function AchievementsServiceWrapper() {
    // Create an achievements service
    var achievementsService = new AchievementsService();

    // Register an achievement class for enabling sharing
    achievementsService.register({
      name: "Enable sharing",
      description: "Share your apps, addons and themes",
      criteria: ACHIEVEMENT_CRITERIA
    });

    // When sharing is enabled, reward an achievement
    BroadcastService.addEventListener("broadcast", function (_ref) {
      var broadcast = _ref.broadcast;
      if (!broadcast) {
        // Do nothing if sharing is disabled
        return;
      }
      achievementsService.reward(ACHIEVEMENT_CRITERIA, EVIDENCE);
    });
  };

  exports["default"] = new AchievementsServiceWrapper();
});