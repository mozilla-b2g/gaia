/* global FTEWizard
*/
'use strict';
(function(exports) {

  var tutorialContainer = document.body;

  var tutorial = new FTEWizard('castingTutorial');
  tutorial.init({
    container: tutorialContainer,
    pageClass: 'slide',
    buttonsClass: 'slide-button',
    launchEveryTime: true,
    onfinish: function () {
      // Rewrite the location to trigger the mozbrowserlocationchange event
      // to let the outer app know user finishes this tutorial
      window.location.href = window.location.href + '#finished';
    }.bind(tutorial)
  });

  exports.tutorial = tutorial;

})(window);
