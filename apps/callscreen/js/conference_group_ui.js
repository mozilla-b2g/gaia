/* globals CallScreen, LazyLoader */

/* exported ConferenceGroupUI */

'use strict';

/**
 * This object manages the view (UI) of the details of an ongoing conference
 *  call, this is the presentation of the details of the parties currently
 *  participating on it (phone number, contact name, phone number type, etc.,
 *  if any).
 * The needed HTML code is lazy loaded during object initialization in the
 *  init() function. The object takes care of the initialization automatically.
 * The object provides functions to:
 *  - Add and remove calls to the ongoing conference call details information
 *    overlay.
 *  - Show and hide the ongoing conference call details information overlay.
 *  - Mark the calls participating in an ended conference call as hang up.
 *  - Set the title of the ongoing conference call details information overlay.
 */
var ConferenceGroupUI = (function() {

  /**
   * Object initialization.
   */

  var groupCalls = document.getElementById('group-call-details'),
      groupCallsList,
      groupCallsHeader,
      initialized = false,
      bdiGroupCallsCountElt;

  document.getElementById('group-show').addEventListener(
    'click', showGroupDetails);

  /**
   * Private helper functions.
   */

  function _init(callback) {
    if (initialized) {
      callback();
    }

    LazyLoader.load([groupCalls], function() {
      groupCallsHeader = groupCalls.querySelector('header');
      groupCallsList = document.getElementById('group-call-details-list');
      document.getElementById('group-hide').addEventListener(
        'click', _hideGroupDetails);

      if (!initialized) {
        bdiGroupCallsCountElt = document.createElement('bdi');
        groupCallsHeader.appendChild(bdiGroupCallsCountElt);
      }
      initialized = true;
      callback();
    });
  }

  function _hideGroupDetails(evt) {
    if (evt) {
      evt.preventDefault();
    }

    // If the conference call has ended, remove all the nodes from the
    // conference call participant list overlay.
    if (!navigator.mozTelephony.conferenceGroup.calls.length) {
      _removeAllCalls();
    }

    // Close the overlay.
    groupCalls.classList.remove('display');
  }

  function _removeAllCalls() {
    var callNodes = groupCalls.querySelectorAll('.handled-call');
    for (var i = 0; i < callNodes.length; i++) {
      removeCall(callNodes[i]);
    }
  }

  /**
   * Public functions exposed by the object.
   */

  /**
   * Adds a call node (including information about the phone number, contact
   *  name, phone number type, if any) to an ongoing conference call details
   *  information overlay.
   */
  function addCall(node) {
    _init(function() {
      groupCallsList.appendChild(node);
    });
  }

  /**
   * Removes a call node from an ongoing conference call details information
   *  overlay.
   */
  function removeCall(node) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  /**
   * Shows the ongoing conference call details information overlay.
   * @param {MouseEvent} evt The mouse event requesting the showing of the
   *  ongoing conference call details overlay.
   */
  function showGroupDetails(evt) {
    if (evt) {
      evt.stopPropagation();
    }
    groupCalls.classList.add('display');
  }

  /**
   * Hides the ongoing conference call details information overlay. The default
   *  Call Screen app closing delay is applied if the overlay is currently
   *  shown.
   */
  function hideGroupDetails() {
    setTimeout(_hideGroupDetails,
               ConferenceGroupUI.isGroupDetailsShown() ?
                 CallScreen.callEndPromptTime : 0);
  }

  /**
   * Returns the visibility status of the ongoing conference call details
   *  information overlay.
   * @returns {Boolean} Visibility status of the ongoing conference call details
   *  information overlay.
   */
  function isGroupDetailsShown() {
    return groupCalls.classList.contains('display');
  }

  /**
   * Marks all the calls in an already ended conference call details
   *  information overlay as hang up.
   */
  function markCallsAsEnded() {
    _init(function() {
      var callElems = groupCallsList.getElementsByTagName('SECTION');
      for (var i = 0; i < callElems.length; i++) {
        callElems[i].dataset.groupHangup = 'groupHangup';
      }
    });
  }

  /**
   * Sets the title of the ongoing conference call details information overlay.
   * @param {String} text The text to set as the title.
   */
  function setGroupDetailsHeader(text) {
    _init(function() {
      bdiGroupCallsCountElt.textContent = text;
    });
  }

  return {
    addCall: addCall,
    removeCall: removeCall,
    showGroupDetails: showGroupDetails,
    hideGroupDetails: hideGroupDetails,
    isGroupDetailsShown: isGroupDetailsShown,
    markCallsAsEnded: markCallsAsEnded,
    setGroupDetailsHeader: setGroupDetailsHeader
  };
})();
