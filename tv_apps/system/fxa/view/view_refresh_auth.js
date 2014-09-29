/* global FxaModuleStates */
/* exported View */
'use strict';

/*
 *
 * "View" object defines the number of steps to follow and the
 * first step of the flow. Then entire flow is self-contained, so
 * once the first step is loaded the next ones are loaded taking into
 * consideration the decision taken by the user.
 * Number of steps is needed for showing to the user the progress bar.
 *
 */

var View = {
  length: 1,
  start: FxaModuleStates.REFRESH_AUTH
};
