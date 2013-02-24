/*
 * visibility_monitor.js
 *
 * Given a scrolling container element (with overflow-y: scroll set,
 * e.g.), monitorChildVisibility() listens for scroll events in order to
 * determine which child elements are visible within the element and
 * which are not (assuming that the element itself is visible).
 *
 * When a child scrolls onscreen, it is passed to the onscreen callback.
 *
 * When a child scrolls offscreen, it is passed to the offscreen callback.
 *
 * This class also listens for DOM modification events so that it can handle
 * children being added to or removed from the scrolling element. It also
 * handles resize events.
 *
 * Note that this class only pays attention to the direct children of
 * the container element, not all ancestors.
 *
 * When you insert a new child into the container, you should create it in
 * its offscreen state. If it is inserted offscreen nothing will happen.
 * If you insert it onscreen, it will immediately be passed to the onscreen
 * callback function
 *
 * The scrollmargin argument specifies a number of pixels. Elements
 * that are within this many pixels of being onscreen are considered
 * onscreen.
 *
 * The scrolldelta parameter is also a number of pixels.  The user
 * must scroll this distance before any visibility recomputation is
 * done by this code.  This parameter can be used to "batch" up work
 * into larger chunks.
 *
 * By specifing proper onscreen and offscreen functions you can use this
 * class to (for example) remove the background-image style of elements
 * that are not visible, allowing gecko to free up image memory.
 * In that sense, this class can be used to workaround
 * https://bugzilla.mozilla.org/show_bug.cgi?id=689623
 *
 * The return value of this function is an object that has a stop() method.
 * calling the stop method stops visiblity monitoring. If you want to restart
 * call monitorChildVisiblity() again.
 *
 * monitorChildVisiblity() makes the following assumptions. If your program
 * violates them, the function may not work correctly:
 *
 *  Child elements of the container element flow left to right and
 *  top to bottom. I.e. the nextSibling of a child element never has a
 *  smaller clientTop value. They are not absolutely positioned and don't
 *  move on their own.
 *
 *  The children of the container element are themselves all elements;
 *  there are no text nodes or comments cluttering things up.
 *
 *  Children don't change size, either spontaneously or in response to
 *  onscreen and offscreen callbacks. Don't set display:none on an element
 *  when it goes offscreen, for example.
 *
 *  Children aren't added or removed to the container while the container
 *  or any of its ancestors is hidden with display:none or is removed from
 *  the tree. The mutation observer that responds to additions and deletions
 *  needs the container and its children to have valid layout data in order
 *  to figure out what is onscreen and what is offscreen. Use visiblity:hidden
 *  instead of display:none if you need to add or remove children while
 *  the container is hidden.
 *
 *  DocumentFragments are not used to add multiple children at once to
 *  the container, and multiple children are not deleted at once by
 *  setting innerHTML or innerText to ''.
 *
 *  The container element only changes size when there is a resize event
 *  on the window.
 */
'use strict';

function monitorChildVisibility(container,
                                scrollmargin, scrolldelta,
                                onscreenCallback, offscreenCallback)
{
  // The onscreen region is represented by these two elements
  var firstOnscreen = null, lastOnscreen = null;

  // This is the last onscreen region that we have notified the client about
  var firstNotifiedOnscreen = null, lastNotifiedOnscreen = null;

  // The timer used by deferCallbacks()
  var pendingCallbacks = null;

  // The scrolltop on |container| our scroll handler saw before we
  // last recomputed visibility.
  var lastScrollTop = -1;

  // Update the onscreen region whenever we scroll
  container.addEventListener('scroll', scrollHandler);

  // Update the onscreen region when the window changes size
  window.addEventListener('resize', resizeHandler);

  // Update the onscreen region when children are added or removed
  var observer = new MutationObserver(mutationHandler);
  observer.observe(container, { childList: true });

  // Now determine the initial onscreen region
  adjustBounds();

  // Call the onscreenCallback for the initial onscreen elements
  callCallbacks();

  // Return an object that allows the caller to stop monitoring
  return {
    stop: function stop() {
      // Unregister our event handlers and stop the mutation observer.
      container.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', resizeHandler);
      observer.disconnect();
    }
  };

  // Adjust the onscreen element range and synchronously call onscreen
  // and offscreen callbacks as needed.
  function resizeHandler() {
    // If we are triggered with 0 height, ignore the event. If this happens
    // we don't have any layout data and we'll end up thinking that all
    // of the children are onscreen.  Better to do nothing at all here and
    // just wait until the container becomes visible again.
    if (container.clientHeight === 0) {
      return;
    }
    adjustBounds();
    callCallbacks();
  }

  // This gets called when children are added or removed from the container.
  // Adding and removing nodes can change the position of other elements
  // so changes may extend beyond just the ones added or removed
  function mutationHandler(mutations) {
    // Ignore any mutations while we are not displayed because
    // none of our calculations will be right
    if (container.clientHeight === 0) {
      return;
    }

    // If there are any pending callbacks, call them now before handling
    // the mutations so that we start off in sync, with the onscreen range
    // equal to the notified range.
    if (pendingCallbacks)
      callCallbacks();

    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var child = mutation.addedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE)
            childAdded(child);
        }
      }

      if (mutation.removedNodes) {
        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var child = mutation.removedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE)
            childRemoved(child,
                         mutation.previousSibling,
                         mutation.nextSibling);
        }
      }
    }
  }

  // If the new child is onscreen, call the onscreen callback for it.
  // Adjust the onscreen element range and synchronously call
  // onscreen and offscreen callbacks as needed.
  function childAdded(child) {
    // If the added child is after the last onscreen child, and we're
    // not filling in the first page of content then this insertion
    // doesn't affect us at all.
    if (lastOnscreen &&
        after(child, lastOnscreen) &&
        child.offsetTop > container.clientHeight + scrollmargin)
      return;

    // Otherwise, if this is the first element added or if it is after
    // the first onscreen element, then it is onscreen and we need to
    // call the onscreen callback for it.
    if (!firstOnscreen || after(child, firstOnscreen)) {
      // Invoke the onscreen callback for this child
      try {
        onscreenCallback(child);
      }
      catch (e) {
        console.warn('monitorChildVisiblity: Exception in onscreenCallback:',
                     e, e.stack);
      }
    }

    // Now adjust the first and last onscreen element and
    // send a synchronous notification
    adjustBounds();
    callCallbacks();
  }

  // If the removed element was after the last onscreen element just return.
  // Otherwise adjust the onscreen element range and synchronously call
  // onscreen and offscreen callbacks as needed. Note, however that there
  // are some special cases when the last element is deleted or when the
  // first or last onscreen element is deleted.
  function childRemoved(child, previous, next) {
    // If there aren't any elements left revert back to initial state
    if (container.firstElementChild === null) {
      firstOnscreen = lastOnscreen = null;
      firstNotifiedOnscreen = lastNotifiedOnscreen = null;
    }
    else {
      // If the removed child was after the last onscreen child, then
      // this removal doesn't affect us at all.
      if (previous !== null && after(previous, lastOnscreen))
        return;

      // If the first onscreen element was the one removed
      // use the next or previous element as a starting point instead.
      // We know that there is at least one element left, so one of these
      // two must be defined.
      if (child === firstOnscreen) {
        firstOnscreen = firstNotifiedOnscreen = next || previous;
      }

      // And similarly for the last onscreen element
      if (child === lastOnscreen) {
        lastOnscreen = lastNotifiedOnscreen = previous || next;
      }

      // Find the new bounds after the deletion
      adjustBounds();
    }

    // Synchronously call the callbacks
    callCallbacks();
  }

  // Adjust the onscreen element range and asynchronously call
  // onscreen and offscreen callbacks as needed. We do this
  // asynchronously so that if we get lots of scroll events in
  // rapid succession and can't keep up, we can skip some of
  // the notifications.
  function scrollHandler() {
    // Ignore scrolls while we are not displayed because
    // none of our calculations will be right
    if (container.clientHeight === 0) {
      return;
    }

    // Adjust the first and last onscreen element if we've panned
    // beyond the scrolldelta margin.
    var scrollTop = container.scrollTop;
    if (Math.abs(scrollTop - lastScrollTop) < scrolldelta) {
      return;
    }

    lastScrollTop = scrollTop;

    adjustBounds();

    if (scrolldelta > 1) {
      // Assume that clients are using the scrolldelta to batch work,
      // and that they want finer control over scheduling.  Recompute
      // visibility immediately.
      callCallbacks();
    } else {
      // Assume that clients are relying on us to throttle work while
      // the user is busy.
      //
      // We may get a lot of scroll events in quick succession, so
      // don't call the callbacks synchronously. Instead defer so that
      // we can handle any other queued scroll events.
      deferCallbacks();
    }
  }

  // Return true if node a is before node b and false otherwise
  function before(a, b) {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  // Return true if node a is after node b and false otherwise
  function after(a, b) {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  // This function recomputes the range of onscreen elements. Normally it
  // just needs to do small amounts of nextElementSibling
  // or previousElementSibling iteration to find the range. But it can also
  // start from an unknown state and search the entire container to find
  // the range of child elements that are onscreen.
  function adjustBounds() {
    // If the container has no children, the bounds are null
    if (container.firstElementChild === null) {
      firstOnscreen = lastOnscreen = null;
      return;
    }

    // Compute the visible region of the screen, including scroll margin
    var scrollTop = container.scrollTop;
    var screenTop = scrollTop - scrollmargin;
    var screenBottom = scrollTop + container.clientHeight + scrollmargin;

    // This utility function returns ON if the child is onscreen,
    // BEFORE if it offscreen before the visible elements and AFTER if
    // it is offscreen aafter the visible elements
    var BEFORE = -1, ON = 0, AFTER = 1;
    function position(child) {
      var childTop = child.offsetTop;
      var childBottom = childTop + child.offsetHeight;
      if (childBottom < screenTop)
        return BEFORE;
      if (childTop > screenBottom)
        return AFTER;
      return ON;
    }

    // If we don't have a first onscreen element yet, start with the first.
    if (!firstOnscreen)
      firstOnscreen = container.firstElementChild;

    // Check the position of the top
    var toppos = position(firstOnscreen);

    // If the first element is onscreen, see if there are earlier ones
    if (toppos === ON) {
      var prev = firstOnscreen.previousElementSibling;
      while (prev && position(prev) === ON) {
        firstOnscreen = prev;
        prev = prev.previousElementSibling;
      }
    }
    else if (toppos === BEFORE) {
      // The screen is below us, so find the next element that is visible.
      var e = firstOnscreen.nextElementSibling;
      while (e && position(e) !== ON) {
        e = e.nextElementSibling;
      }
      firstOnscreen = e;
    }
    else {
      // We've scrolled a lot or things have moved so much that the
      // entire visible region is now above the first element.
      // So scan backwards to find the new lastOnscreen and firstOnscreen
      // elements.  Note that if we get here, we can return since we
      // will have updated both bounds

      // Loop until we find an onscreen element
      lastOnscreen = firstOnscreen.previousElementSibling;
      while (lastOnscreen && position(lastOnscreen) !== ON)
        lastOnscreen = lastOnscreen.previousElementSibling;

      // Now loop from there to find the first onscreen element
      firstOnscreen = lastOnscreen;
      prev = firstOnscreen.previousElementSibling;
      while (prev && position(prev) === ON) {
        firstOnscreen = prev;
        prev = prev.previousElementSibling;
      }
      return;
    }

    // Now make the same adjustment on the bottom of the onscreen region
    // If we don't have a lastOnscreen value to start with, use the newly
    // computed firstOnscreen value.
    if (lastOnscreen === null)
      lastOnscreen = firstOnscreen;

    var bottompos = position(lastOnscreen);
    if (bottompos === ON) {
      // If the last element is onscreen, see if there are more below it.
      var next = lastOnscreen.nextElementSibling;
      while (next && position(next) === ON) {
        lastOnscreen = next;
        next = next.nextElementSibling;
      }
    }
    else if (bottompos === AFTER) {
      // the last element is now below the visible part of the screen
      lastOnscreen = lastOnscreen.previousElementSibling;
      while (position(lastOnscreen) !== ON)
        lastOnscreen = lastOnscreen.previousElementSibling;
    }
    else {
      // First and last are now both above the visible portion of the screen
      // So loop down to find their new positions
      firstOnscreen = lastOnscreen.nextElementSibling;
      while (firstOnscreen && position(firstOnscreen) !== ON) {
        firstOnscreen = firstOnscreen.nextElementSibling;
      }

      lastOnscreen = firstOnscreen;
      var next = lastOnscreen.nextElementSibling;
      while (next && position(next) === ON) {
        lastOnscreen = next;
        next = next.nextElementSibling;
      }
    }
  }

  // Call the callCallbacks() function after any pending events are processed
  // We use this for asynchronous notification after scroll events.
  function deferCallbacks() {
    if (pendingCallbacks) {
      // XXX: or we could just return here, which would defer for less time.
      clearTimeout(pendingCallbacks);
    }
    pendingCallbacks = setTimeout(callCallbacks, 0);
  }

  // Synchronously call the callbacks to notify the client of the new set
  // of onscreen elements. This only calls the onscreen and offscreen
  // callbacks for elements that have come onscreen or gone offscreen since
  // the last time it was called.
  function callCallbacks() {
    // If there is a pending call to this function (or if this was the pending
    // call) clear it now, since we are sending the callbacks
    if (pendingCallbacks) {
      clearTimeout(pendingCallbacks);
      pendingCallbacks = null;
    }

    // Call the onscreen callback for element from and its siblings
    // up to, but not including to.
    function onscreen(from, to) {
      var e = from;
      while (e && e !== to) {
        try {
          onscreenCallback(e);
        }
        catch (ex) {
          console.warn('monitorChildVisibility: Exception in onscreenCallback:',
                       ex, ex.stack);
        }
        e = e.nextElementSibling;
      }
    }

    // Call the offscreen callback for element from and its siblings
    // up to, but not including to.
    function offscreen(from, to) {
      var e = from;
      while (e && e !== to) {
        try {
          offscreenCallback(e);
        }
        catch (ex) {
          console.warn('monitorChildVisibility: ' +
                       'Exception in offscreenCallback:',
                       ex, ex.stack);
        }
        e = e.nextElementSibling;
      }
    }

    // If the two ranges are the same, return immediately
    if (firstOnscreen === firstNotifiedOnscreen &&
        lastOnscreen === lastNotifiedOnscreen)
      return;

    // If the last notified range is null, then we just add the new range
    if (firstNotifiedOnscreen === null) {
      onscreen(firstOnscreen, lastOnscreen.nextElementSibling);
    }

    // If the new range is null, this means elements have been removed.
    // We don't need to call offscreen for elements that are not in the
    // container anymore, so we don't do anything in this case
    else if (firstOnscreen === null) {
      // Nothing to do here
    }

    // If the new range and the old range are disjoint, call the onscreen
    // callback for the new range first and then call the offscreen callback
    // for the old.
    else if (before(lastOnscreen, firstNotifiedOnscreen) ||
             after(firstOnscreen, lastNotifiedOnscreen)) {
      // Mark the new ones onscreen
      onscreen(firstOnscreen, lastOnscreen.nextElementSibling);

      // Mark the old range offscreen
      offscreen(firstNotifiedOnscreen,
                lastNotifiedOnscreen.nextElementSibling);
    }

    // Otherwise if new elements are visible at the top, call those callbacks
    // If new elements are visible at the bottom, call those.
    // If elements have gone offscreen at the top, call those callbacks
    // If elements have gone offscreen at the bottom, call those.
    else {
      // Are there new onscreen elements at the top?
      if (before(firstOnscreen, firstNotifiedOnscreen)) {
        onscreen(firstOnscreen, firstNotifiedOnscreen);
      }

      // Are there new onscreen elements at the bottom?
      if (after(lastOnscreen, lastNotifiedOnscreen)) {
        onscreen(lastNotifiedOnscreen.nextElementSibling,
                 lastOnscreen.nextElementSibling);
      }

      // Have elements gone offscreen at the top?
      if (after(firstOnscreen, firstNotifiedOnscreen)) {
        offscreen(firstNotifiedOnscreen, firstOnscreen);
      }

      // Have elements gone offscreen at the bottom?
      if (before(lastOnscreen, lastNotifiedOnscreen)) {
        offscreen(lastOnscreen.nextElementSibling,
                  lastNotifiedOnscreen.nextElementSibling);
      }
    }

    // Now the notified onscreen range is in sync with the actual
    // onscreen range.
    firstNotifiedOnscreen = firstOnscreen;
    lastNotifiedOnscreen = lastOnscreen;
  }
}
