/*exported monitorTagVisibility */

'use strict';

function monitorTagVisibility(
  container,
  tag,
  scrollMargin,
  scrollDelta,
  onscreenCallback,
  offscreenCallback
) {

  //====================================
  //  API
  //====================================

  function pauseMonitoringMutations() {
  }

  function resumeMonitoringMutations(forceVisibilityUpdate) {
  }

  function stopMonitoring() {
  }

  return {
    pauseMonitoringMutations: pauseMonitoringMutations,
    resumeMonitoringMutations: resumeMonitoringMutations,
    stop: stopMonitoring
  };
}
