/* globals CallsHandler, CallScreen, ConferenceGroupUI, FontSizeManager */

/* exported ConferenceGroupHandler */

'use strict';
/**
 * Manages and handles conference call logic.
 * Exposes the following functionality:
 *  - To add and to remove calls to and from the ongoing conference call details
 *     information overlay.
 *  - To be signaled by other actors that a conference call has ended.
 *  - To check if the conference call details information overlay is shown.
 *  - To get the current conference call duration.
 */
var ConferenceGroupHandler = (function() {

  /* Observe changes to the node that holds the group call duration, this is
   * also used for displaying the call ended string and needs to be resized
   * dynamically to accomodate for certain locales. */
  function initStringAutoResize() {
    var mutationObserverConfig = { childList: true };
    var mutationObserver = new MutationObserver(function(mutations) {
      if (groupDurationChildNode.hasAttribute('data-l10n-id') &&
          groupDurationChildNode.getAttribute('data-l10n-id') === 'callEnded') {
        /* Disable the observer to prevent it from being called recursively
         * while we modify the DOM tree, re-enable it once we're done. */
        mutationObserver.disconnect();
        FontSizeManager.adaptToSpace(
          CallScreen.getScenario(), groupLabel, false, 'end');
        mutationObserver.observe(groupDurationChildNode,
                                 mutationObserverConfig);
      }
    });
    mutationObserver.observe(groupDurationChildNode, mutationObserverConfig);
  }

  /**
   * Object initialization.
   */
  var bdiCount = document.createElement('bdi');
  var groupLine = document.getElementById('group-call');
  var groupLabel = document.getElementById('group-call-label');
  groupLabel.appendChild(bdiCount);
  // FIXME/bug 1007148: Refactor duration element structure
  var groupDuration = document.querySelector('#group-call > .duration');
  var groupDurationChildNode = groupDuration.querySelector('span');
  var groupTotalDurationChildNode =
    groupDuration.querySelector('.total-duration');

  var telephony = window.navigator.mozTelephony;
  if (telephony.conferenceGroup) {
    telephony.conferenceGroup.oncallschanged = onCallsChanged;
    telephony.conferenceGroup.onstatechange = onStateChange;
  }

  initStringAutoResize();

  /**
   * Private helper functions.
   */

  function onCallsChanged() {
    var calls = telephony.conferenceGroup.calls;
    CallScreen.updateCallsDisplay();
    // Hide the conference call participant list overlay if the conference call
    //  has ended.
    if (!calls.length) {
      ConferenceGroupUI.hideGroupDetails();
    }

    var id = 'conferenceCall';
    var args = { n: calls.length };

    navigator.mozL10n.setAttributes(bdiCount, id, args);
    ConferenceGroupUI.setGroupDetailsHeader({ id: id, args: args });

    // When hanging up phones on conferenceGroup.calls.length >= 2,
    // we need to update handledCalls here since conferenceGroup.oncallschanged
    // rather than telephony.oncallschanges raises.
    // In case of conferenceGroup.calls.length < 2, check should be performed
    // in onStateChange to ignore transitional oncallschanged events before
    // exiting.
    if (telephony.conferenceGroup.calls.length >= 2) {
      CallsHandler.checkCalls();
    }

    if (CallsHandler.isFirstCallOnCdmaNetwork()) {
      CallScreen.cdmaConferenceCall();
    }
  }

  function show() {
    groupLine.hidden = false;
    groupLine.classList.remove('ended');
    groupLine.classList.remove('held');
    CallScreen.createTicker(groupDuration);
    CallScreen.setCallerContactImage();
  }

  function end() {
    groupTotalDurationChildNode.textContent =
      groupDurationChildNode.textContent;
    navigator.mozL10n.setAttributes(groupDurationChildNode, 'callEnded');
    groupLine.classList.add('ended');
    groupLine.classList.remove('held');
    CallScreen.stopTicker(groupDuration);

    setTimeout(function(evt) {
      groupLine.hidden = true;
      CallScreen.updateCallsDisplay();
    }, CallScreen.callEndPromptTime);
  }

  function onStateChange() {
    switch (telephony.conferenceGroup.state) {
      case 'connected':
        show();
        CallScreen.render('connected');
        break;
      case 'held':
        groupLine.classList.add('held');
        CallScreen.render('connected-hold');
        break;
      case '':
        // Exiting conference call
        end();
        CallsHandler.checkCalls();
        break;
    }
  }

  /**
   * Publicly exposed API functions.
   */

  function signalConferenceEnded() {
    ConferenceGroupUI.markCallsAsEnded();
  }

  function addToGroupDetails(node) {
    ConferenceGroupUI.addCall(node);
  }

  function removeFromGroupDetails(node) {
    ConferenceGroupUI.removeCall(node);
  }

  function isGroupDetailsShown() {
    return ConferenceGroupUI.isGroupDetailsShown();
  }

  return {
    addToGroupDetails: addToGroupDetails,
    removeFromGroupDetails: removeFromGroupDetails,
    signalConferenceEnded: signalConferenceEnded,
    isGroupDetailsShown: isGroupDetailsShown,
    get currentDuration() {
      return groupDurationChildNode.textContent;
    }
  };
})();
