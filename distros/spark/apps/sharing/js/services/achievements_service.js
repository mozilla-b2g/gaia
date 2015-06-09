define(["exports", "fxos-achievements-service/dist/achievements-service", "app/js/services/broadcast_service"], function (exports, _fxosAchievementsServiceDistAchievementsService, _appJsServicesBroadcastService) {
  "use strict";

  var AchievementsService = _fxosAchievementsServiceDistAchievementsService["default"];
  var BroadcastService = _appJsServicesBroadcastService["default"];


  var ACHIEVEMENT_CRITERIA = "achievements/sharing-is-caring";
  var ACHIEVEMENT_EVIDENCE = "urn:sharing:p2p_broadcast:true";

  var AchievementsServiceWrapper = function AchievementsServiceWrapper() {
    // Create an achievements service
    var achievementsService = new AchievementsService();

    // When sharing is enabled, reward an achievement
    BroadcastService.addEventListener("broadcast", function (_ref) {
      var broadcast = _ref.broadcast;
      if (!broadcast) {
        // Do nothing if sharing is disabled
        return;
      }
      achievementsService.reward({
        criteria: ACHIEVEMENT_CRITERIA,
        evidence: ACHIEVEMENT_EVIDENCE,
        name: "Sharing is Caring",
        description: "Share your apps and add-ons with the Sharing app",
        image: "icons/sharing-is-caring.png"
      });
    });
  };

  exports["default"] = new AchievementsServiceWrapper();
});