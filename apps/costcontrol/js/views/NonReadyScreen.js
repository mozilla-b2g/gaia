'use strict';

/* global Common */
/* global _ */

function NonReadyScreen(container) {
  this.id = container.id;
  this.container = container;
  this.activity = container.querySelector('progress');
  this.header = container.querySelector('h3');
  this.message = container.querySelector('p');
  this.button = container.querySelector('button');

  this.button.onclick = Common.closeApplication;
}

// Configure the non ready screen depending on the card status. For
// absent, pinRequired and pukRequired, shows a message and give the
// user the opportunity to close the app. For other states, it shows
// a progress spinner.
NonReadyScreen.prototype.updateForState = function(cardState) {
  switch (cardState) {
    case null:
    case 'absent':
    case 'pinRequired':
    case 'pukRequired':
      this.setMessageMode(cardState);
    break;

    default:
      this.setWaitingMode();
    break;
  }
};

NonReadyScreen.prototype.setMessageMode = function(cardState) {
  this.activity.setAttribute('aria-hidden', true);
  [this.header, this.message, this.button.parentNode].forEach(function(el) {
    el.setAttribute('aria-hidden', false);
  });

  var messageId = this.getMessageIdFor(cardState);
  if (messageId) {
    var header = _('widget-' + messageId + '-heading');
    var msg = _('widget-' + messageId + '-meta');
    this.header.textContent = header;
    this.message.textContent = msg;
  }
};

NonReadyScreen.prototype.setWaitingMode = function() {
  this.activity.setAttribute('aria-hidden', false);
  [this.header, this.message, this.button.parentNode].forEach(function(el) {
    el.setAttribute('aria-hidden', true);
  });
};

NonReadyScreen.prototype.getMessageIdFor = function(cardState) {
  var message;

  // SIM is absent
  if (!cardState || cardState === 'absent') {
    message = 'no-sim2';

  // SIM is locked
  } else if (
    cardState === 'pinRequired' ||
    cardState === 'pukRequired'
  ) {
    message = 'sim-locked';
  }

  return message;
};
