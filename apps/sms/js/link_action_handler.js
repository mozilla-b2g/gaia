'use strict';
/*
 Centralized event handling for various
 data-actions url, email, phone in a message
*/

var LinkActionHandler = {
  handleBrowserEvent:
  function lah_handleBrowserEvent(link) {
    try {
      var activity = new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: link
          }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  //Invokes handleBrowserEvent for now, and
  //in future will expand to call handlePhoneEvent,
  //handleEmailEvent.
  handleEvent:
   function lah_handleEvent(evt) {
     //Return if activity is already invoked
     if (this.activityInProgress) { return; }
     var eventAction = evt.target.dataset.action;
        if (eventAction && eventAction === 'url-link') {
          this.activityInProgress = true;
          this.handleBrowserEvent(evt.target.dataset.url);
        }
  },

  resetActivityInProgress:
   function lah_resetActivityInProgress() {
     this.activityInProgress = false;
  }
};
