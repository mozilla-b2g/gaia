'use strict';

function MockNonReadyScreen(container) {
  this.id = container.id;
}

MockNonReadyScreen.prototype.updateForState = function(cardState) {
  var event = new CustomEvent('nonReadyScreenUpdated', { detail: cardState });
  window.dispatchEvent(event);
  console.log('NonReadyScreen in state: ' + cardState);
};
