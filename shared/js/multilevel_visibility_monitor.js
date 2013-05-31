/*====================================
  MonitorMultilevelChildVisibility
    monitors which dom nodes in a scrollable container are visible

    see examples directly below to get an idea of how to use

    generalized function and more info starts at line 83

====================================*/
'use strict';

//====================================
//  useful implementations / examples
//====================================

function monitorGrandchildWithTagVisibility(
  container,
  scrollMargin,
  scrollDelta,
  tagName,
  onscreenCallback,
  offscreenCallback
) {
  var maxDepth = 2;
  return monitorChildWithTagVisibility(
    container,
    scrollMargin,
    scrollDelta,
    maxDepth,
    tagName,
    function(elem, depth) {
      if (depth == 2)
        onscreenCallback(elem, depth);
    },
    function(elem, depth) {
      if (depth == 2)
        offscreenCallback(elem, depth);
    });
}

function monitorChildWithTagVisibility(
  container,
  scrollMargin,
  scrollDelta,
  maxDepth,
  tagName,
  onscreenCallback,
  offscreenCallback
) {
  var tagName = tagName.toUpperCase();
  return monitorMultilevelChildVisibility(
    container,
    scrollMargin,
    scrollDelta,
    maxDepth,
    function(elem, depth) {
      if (elem.tagName === tagName)
        onscreenCallback(elem, depth);
    },
    function(elem, depth) {
      if (elem.tagName === tagName)
        offscreenCallback(elem, depth);
    });
}

function monitorDirectChildVisibility(
  container,
  scrollMargin,
  scrollDelta,
  onscreenCallback,
  offscreenCallback
) {
  return monitorMultilevelChildVisibility(
                         container,
                         scrollMargin,
                         scrollDelta,
                         1,
                         onscreenCallback,
                         offscreenCallback);
}

/*====================================
  MonitorMultilevelChildVisibility
    generalized function to watch children of a container at any depth level
    returns object containing stop function

    ------------------------------------

    arguments
      container,
      scrollMargin
        - how close an element needs to be to the container edge to be
          considered onscreen
      scrollDelta,
        - how much the container needs to be scrolled before onscreen
          and offscreen are recalculated
      maxDepth
        - max depth from container to monitor (1 === direct children)
      onscreenCallback,
        - called with the element that is now onscreen
      offscreenCallback
        - called with the element that is now offscreen

    ------------------------------------

    assumptions
      children flow top to bottom
      children are not absolutely positioned
      children do not move on their own
      children don't change size or become hidden
      the container is not statically positioned
      the container element only changes size on a resize event

    ------------------------------------

    high level overview of implementation
      more details can be found in comments closer to the implementation itself

      the central algorithm contains 2 stages
        1) visibility computation
          - computing the first and last visible element
        2) notification of offscreen / onscreen
          - notifying elements between the old first element on screen and the
            new first element on screen
          - notifying elements between the old last element on screen and the
            new last element on screen

        - the central algorithm is triggered whenever an event is received that
          suggests the visibility may have changed
            - onscroll
            - onresize
            - mutation of any child element (mutation observer)

====================================*/

function monitorMultilevelChildVisibility(
  container,
  scrollMargin,
  scrollDelta,
  maxDepth,
  onscreenCallback,
  offscreenCallback
) {

  // compatability mode if called with same arguments as monitorChildVisibility
  if (offscreenCallback === undefined &&
      typeof maxDepth === 'function') {
    offscreenCallback = onscreenCallback;
    onscreenCallback = maxDepth;
    maxDepth = 1;
    console.warn('MonitorMultilevelChildVisibility is using compatibility ' +
                 'mode. See the new api at /shared/js/' +
                 'multilevel_visibility_monitor.js');
  }

  // we need offsetTop to work properly, which will only happen if the container
  // is not position: static
  if (container.style.position === 'static') {
    console.warn(
          'MonitorMultilevelChildVisibility:' +
          '"position: static" containers not supported,' +
          ' maybe use "position: relative"?');
  }

  //====================================
  //  init
  //====================================

  var g = {}; // global state

  function init() {
    g.firstOnscreen = new Array(maxDepth);
    g.lastOnscreen = new Array(maxDepth);
    g.deepestFirstOnscreen = null;
    g.deepestLastOnscreen = null;
    for (var i = 0; i < maxDepth; i++) {
      g.firstOnscreen[i] = null;
      g.lastOnscreen[i] = null;
    }
    g.pendingCallCallbacksTimeoutId = null;
    g.stopped = false;
    g.last = {
      scrollTop: -1,
      firstOnscreen: g.firstOnscreen.slice(0),
      lastOnscreen: g.lastOnscreen.slice(0),
      deepestFirstOnscreen: null,
      deepestLastOnscreen: null
    };

    //add events that could trigger an element to go onscreen or offscreen
    container.addEventListener('scroll', scrollHandler);
    window.addEventListener('resize', updateVisibility);
    g.observer = new MutationObserver(mutationHandler);
    g.observer.observe(container, { childList: true, subtree: true });

    updateVisibility(true);
  }

  //====================================
  //  event handlers
  //====================================

  function scrollHandler() {
    var scrollTop = container.scrollTop;
    if (Math.abs(scrollTop - g.last.scrollTop) < scrollDelta) {
      return;
    }
    g.last.scrollTop = scrollTop;

    updateVisibility();
  }

  function mutationHandler(mutations) {
    if (container.clientHeight === 0) { //container hidden
      return;
    }

    var removedNodes = {};
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.removedNodes) {
        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var child = mutation.removedNodes[j];
          removedNodes[child] = true;
        }
      }
    }

    // synchronize if necessary, we might have to manipulate the model outside
    // of callCallbacks
    if (g.pendingCallCallbacksTimeoutId !== null)
      callCallbacks();

    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var child = mutation.addedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE) {

            // check if child or a parent of child was removed
            var curr = child;
            var removed = false;
            while (curr !== container) {
              if (removedNodes[curr]) {
                removed = true;
                break;
              }
              curr = curr.parentNode;
            }
            if (removed)
              continue;

            childAdded(child);
          }
        }
      }
      if (mutation.removedNodes) {
        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var child = mutation.removedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE) {
            childRemoved(child,
                         mutation.previousSibling,
                         mutation.nextSibling);
          }
        }
      }
    }
  }

  //---------------------------------------
  //  childAdded
  //    3 possibilities
  //     1) new child below last visible elem
  //         do nothing
  //     2) new clild between first and last visible elems
  //         notify that child is onscreen
  //         recompute visibility
  //     3) new child above first visible elem
  //         recompute visibility
  function childAdded(child) {
    var firstPageHeight = container.clientHeight + scrollMargin;
    if (
        g.deepestLastOnscreen !== null &&
        after(child, g.deepestLastOnscreen) && //after last onscreen child
        child.offsetTop > firstPageHeight //not on first page
    ) {
      return;
    }
    else if (
              g.deepestFirstOnscreen === null ||
              after(child, g.deepestFirstOnscreen)
    ) {
      safeOnscreenCallback(child, getDistance(container, child));
    }
    recomputeFirstAndLastOnscreen();
    callCallbacks();
  }

  //---------------------------------------
  //  childRemoved
  //    3 possibilities
  //     1) container is now empty
  //         reset back to initial state
  //     2) removed child below last visible elem
  //         do nothing
  //     3) removed child was above last visible elem
  //         if child was firstOnscreen or lastOnscreen
  //           firstOnscreen or lastOnscreen now invalid, update it
  //         recompute visibility
  function childRemoved(child, prev, next) {
    if (container.firstElementChild === null) {
      reset();
      return;
    }
    else if (
      g.deepestLastOnscreen !== child &&
      prev !== null && after(prev, g.deepestLastOnscreen)
    ) { // after last onscreen child
      return;
    }
    else {
      var wasUpdate = false;
      wasUpdate |= updateOnscreen(g.firstOnscreen, child, next || prev);
      wasUpdate |= updateOnscreen(g.lastOnscreen, child, prev || next);
      if (wasUpdate)
        calcDeepestOnscreen();

      wasUpdate = false;
      wasUpdate |= updateOnscreen(g.last.firstOnscreen, child, next || prev);
      wasUpdate |= updateOnscreen(g.last.lastOnscreen, child, prev || next);
      if (wasUpdate)
        calcDeepestLastOnscreen();

      recomputeFirstAndLastOnscreen();
      callCallbacks();
    }

  }

  function updateVisibility(callImmediately) {
    if (container.clientHeight === 0) {
      return;
    }
    recomputeFirstAndLastOnscreen();

    if (callImmediately || scrollDelta >= 1) {
      callCallbacks();
    }
    else {
      // put it on the back of the event queue, we'll call it later
      deferCallingCallbacks();
    }
  }

  //====================================
  //  visibility computation
  //====================================

  //---------------------------------------
  //  recomputeFirstAndLastOnscreen
  //    for both firstOnscreen and lastOnscreen, same recursive algorithm
  //      1) given an element, find its sibling which is at least partially
  //         onscreen (using recompute[First/Last]OnscreenSibling)
  //      2) take a child of that element, if its not null, feed it back into
  //         part 1 of the algorithm
  //
  //    - to make this faster, we store a list of guesses about the partially
  //      onscreen element at each depth level. If at any depth level an element
  //      does not match the guess, we invalidate all the guesses below it, and
  //      instead just take the first child of the element
  //
  //    - this algorithm minimizes the number of dom nodes traversed, while
  //      still finding the deepest first and last elements onscreen
  function recomputeFirstAndLastOnscreen() {
    if (container.firstElementChild === null) { //container empty
      for (var i = 0; i < maxDepth; i++) {
        g.firstOnscreen[i] = null;
        g.lastOnscreen[i] = null;
      }
      return;
    }

    // recompute firstOnscreen
    var currentContainer = container;
    for (var i = 0; i < maxDepth; i++) {
      if (g.firstOnscreen[i] === null) {
        g.firstOnscreen[i] = currentContainer.firstElementChild;
        if (g.firstOnscreen[i] === null)
          break;
      }
      var nextFirstOnscreen = recomputeFirstOnscreenSibling(container,
                                                            g.firstOnscreen[i]);
      if (nextFirstOnscreen !== g.firstOnscreen[i]) {
        g.firstOnscreen[i] = nextFirstOnscreen;
        for (var j = i + 1; j < maxDepth; j++) {
          g.firstOnscreen[j] = null;
        }
      }
      currentContainer = g.firstOnscreen[i];
    }

    // recompute lastOnscreen
    currentContainer = container;
    for (var i = 0; i < maxDepth; i++) {
      if (g.lastOnscreen[i] === null) {
        g.lastOnscreen[i] = currentContainer.firstElementChild;
        if (g.lastOnscreen[i] === null)
          break;
      }
      var nextLastOnscreen = recomputeLastOnscreenSibling(container,
                                                          g.lastOnscreen[i]);
      if (nextLastOnscreen !== g.lastOnscreen[i]) {
        g.lastOnscreen[i] = nextLastOnscreen;
        for (var j = i + 1; j < maxDepth; j++) {
          g.lastOnscreen[j] = null;
        }
      }
      currentContainer = g.lastOnscreen[i];
    }
  }

  function recomputeFirstOnscreenSibling(container, guessOfFirstOnscreen) {
    var currentFirstOnscreen = guessOfFirstOnscreen;
    // move until we're past the target
    while (visibilityPosition(container, currentFirstOnscreen) !== BEFORE) {
      var prev = currentFirstOnscreen.previousElementSibling;
      if (prev === null)
        break;
      currentFirstOnscreen = prev;
    }
    // move towards the target
    while (visibilityPosition(container, currentFirstOnscreen) === BEFORE) {
      var next = currentFirstOnscreen.nextElementSibling;
      if (next === null)
        break;
      currentFirstOnscreen = next;
    }
    return currentFirstOnscreen;
  }

  function recomputeLastOnscreenSibling(container, guessOfLastOnscreen) {
    var currentLastOnscreen = guessOfLastOnscreen;
    // move until we're past the target
    while (visibilityPosition(container, currentLastOnscreen) !== AFTER) {
      var next = currentLastOnscreen.nextElementSibling;
      if (next === null)
        break;
      currentLastOnscreen = next;
    }
    // move towards the target
    while (visibilityPosition(container, currentLastOnscreen) === AFTER) {
      var prev = currentLastOnscreen.previousElementSibling;
      if (prev === null)
        break;
      currentLastOnscreen = prev;
    }
    return currentLastOnscreen;
  }

  //====================================
  //  notification of offscreen / onscreen
  //====================================

  function deferCallingCallbacks() {
    if (g.pendingCallCallbacksTimeoutId !== null) {
      window.clearTimeout(g.pendingCallCallbacksTimeoutId);
    }
    g.pendingCallCallbacksTimeoutId = setTimeout(callCallbacks, 0);
  }

  //---------------------------------------
  //  callCallbacks
  //    - notifies elements between the new [first/last] onscreen and the old
  //      [first/last] onscreen as either onscreen or offscreen
  //
  //    3 possibilities
  //      1) there is no old [first/last] onscreen
  //          - notify between new firstOnscreen and new lastOnscreen as
  //            onscreen
  //      2) the new first->last onscreen and old first->last onscreen are
  //         disjoint
  //          - notify the old first->last onscreen as offscreen
  //          - notify the new first->last onscreen as onscreen
  //      3) the new first->last onscreen and the old first->last onscreen
  //         overlap
  //          - consider the two ranges (new first->old first), (new last->old
  //            last) separately
  //          - for each of the two ranges, compare the relative positions of
  //            the old and new
  //          - many possibilities. As its hard to compress them beyond the
  //            code, see the else block for this case
  //          - however, here's the intuition behind the 4 possibilities and
  //            their variables
  //              - DECISION PROCESS:
  //                when deciding whether to notify as onscreen or offscreen,
  //                we compare the positions of the old and new elements. For
  //                example, consider if the old firstOnscreen element is below
  //                the new firstOnscreen element. This will occur, for example,
  //                if the user scrolled down, hiding elements that were once
  //                visible, so we will notify those elements as offscreen.
  //              - DETERMINING NOTIFICATION RANGE:
  //                when, for example, notifying elements they are offscreen
  //                between the new firstOnscreen and old firstOnscreen, it
  //                would not be correct to notify the new firstOnscreen as
  //                offscreen. For that reason, we sometimes do not directly
  //                include the end of one of the ranges in our notifications.
  //              - PARENT INCLUSION IN NOTIFICATION RANGE:
  //                in some cases, a range of elements gets notified and some
  //                of that range's parents should not be notified. For that
  //                purpose, we inject a BEFORE, ON, or AFTER variable into
  //                the notification function, so that if an element is not
  //                completely BEFORE, ON, or AFTER the range, it is not
  //                notified.
  //              - OFTENTIMES NOTIFYING ON TWO RANGES:
  //                this is necessary so that we include both nearby parent
  //                elements and elements that are nearby but have different
  //                parents. In some cases, skipping to an element's cousin
  //                will mean that we incorrectly skipped parent elements.
  //                just looking at parents means in some cases we'll miss
  //                the cousins of an element. It is necessary to do both to
  //                ensure we don't miss anything.
  function callCallbacks() {

    if (g.pendingCallCallbacksTimeoutId !== null) {
      window.clearTimeout(g.pendingCallCallbacksTimeoutId);
      g.pendingCallCallbacksTimeoutId = null;
    }

    calcDeepestOnscreen();


    if (g.deepestFirstOnscreen === null || g.deepestLastOnscreen === null) {

    }
    else if (
              g.last.deepestFirstOnscreen === null ||
              g.last.deepestLastOnscreen === null
    ) {
      notifyOnscreenInRange(g.deepestFirstOnscreen, g.deepestLastOnscreen, ON);
    }
    else if (
      before(g.deepestLastOnscreen, g.last.deepestFirstOnscreen) ||
      after(g.deepestFirstOnscreen, g.last.deepestLastOnscreen)
    ) { // disjoint
      notifyOnscreenInRange(g.deepestFirstOnscreen, g.deepestLastOnscreen, ON);
      notifyOffscreenInRange(g.last.deepestFirstOnscreen,
                             g.last.deepestLastOnscreen,
                             ON);
    }
    else { // overlapping
      // onscreen at top
      if (before(g.deepestFirstOnscreen, g.last.deepestFirstOnscreen)) {
        var cousin = prevElementCousin(g.last.deepestFirstOnscreen);
        if (cousin !== null) { //probably elem was first elem in container
          notifyOnscreenInRange(g.deepestFirstOnscreen, cousin, BEFORE);
          var closestPrev = prevElement(g.last.deepestFirstOnscreen);
          if (closestPrev !== cousin)
            notifyOnscreenInRange(cousin, closestPrev, BEFORE);
        }
      }
      // onscreen at bottom
      if (after(g.deepestLastOnscreen, g.last.deepestLastOnscreen)) {
        var cousin = nextElementCousin(g.last.deepestLastOnscreen);
        if (cousin !== null) { //probably elem was first elem in container
          notifyOnscreenInRange(cousin, g.deepestLastOnscreen, AFTER);
          var closestNext = nextElement(g.last.deepestLastOnscreen);
          if (closestNext !== cousin)
            notifyOnscreenInRange(closestNext, cousin, AFTER);
        }
      }
      // offscreen at top
      if (after(g.deepestFirstOnscreen, g.last.deepestFirstOnscreen)) {
        var cousin = prevElementCousin(g.deepestFirstOnscreen);
        if (cousin !== null) { //probably elem was first elem in container
          notifyOffscreenInRange(g.last.deepestFirstOnscreen, cousin, BEFORE);
          var closestPrev = prevElement(g.deepestFirstOnscreen);
          if (closestPrev !== cousin)
            notifyOffscreenInRange(cousin, closestPrev, BEFORE);
        }
      }
      // offscreen at bottom
      if (before(g.deepestLastOnscreen, g.last.deepestLastOnscreen)) {
        var cousin = nextElementCousin(g.deepestLastOnscreen);
        if (cousin !== null) { //probably elem was first elem in container
          notifyOffscreenInRange(cousin, g.last.deepestLastOnscreen, AFTER);
          var closestNext = nextElement(g.deepestLastOnscreen);
          if (closestNext !== cousin)
            notifyOffscreenInRange(closestNext, cousin, AFTER);
        }
      }

    }

    //slice(0) makes a shallow copy
    g.last.firstOnscreen = g.firstOnscreen.slice(0);
    g.last.lastOnscreen = g.lastOnscreen.slice(0);
    g.last.deepestFirstOnscreen = g.deepestFirstOnscreen;
    g.last.deepestLastOnscreen = g.deepestLastOnscreen;
  }

  function notifyOnscreenInRange(start, stop, boundDir) {
    runInRange(start, stop, boundDir, safeOnscreenCallback);
  }

  function notifyOffscreenInRange(start, stop, boundDir) {
    runInRange(start, stop, boundDir, safeOffscreenCallback);
  }

  //---------------------------------------
  //  runInRange
  //    runs a function on all nodes in a range of nodes, as long as the node
  //    lies completely between start and stop in the boundDir. For example, if
  //    boundDir was BEFORE, the bottom of the node must come before the stop
  //    node's buttom.
  function runInRange(start, stop, boundDir, fn) {
    var curr = start;
    var currDepth = getDistance(container, curr);
    var justAscended = false;

    var stopBottom = stop.offsetTop + stop.clientHeight;
    while (curr !== stop) {
      var currBottom = curr.offsetTop + curr.clientHeight;
      if ((boundDir === BEFORE && currBottom <= stopBottom) ||
          (boundDir === AFTER && curr.offsetTop >= start.offsetTop) ||
          (boundDir === ON)) {
        fn(curr, currDepth);
      }
      if (currDepth <= 0) {
        break;
      }
      else if (currDepth < maxDepth && !justAscended) {
        var child = curr.firstElementChild;
        if (child !== null) {
          curr = child;
          currDepth += 1;
          continue;
        }
      }
      var sibling = curr.nextElementSibling;
      if (sibling !== null) {
        curr = sibling;
        justAscended = false;
      }
      else {
        curr = curr.parentNode;
        currDepth -= 1;
        justAscended = true;
      }
    }
    fn(stop, currDepth);
  }

  //====================================
  //  dom helpers
  //====================================

  var BEFORE = -1, ON = 0, AFTER = 1;
  function visibilityPosition(container, child) {

    var scrollTop = container.scrollTop;
    var screenTop = scrollTop - scrollMargin;
    var screenBottom = scrollTop + container.clientHeight + scrollMargin;

    var childTop = child.offsetTop;
    var childBottom = childTop + child.offsetHeight;
    if (childBottom <= screenTop)
      return BEFORE;
    if (childTop >= screenBottom)
      return AFTER;
    return ON;
  }

  function before(a, b) {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function after(a, b) {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  function getDistance(parent, child) {
    var depth = 0;
    var curr = child;
    while (curr !== parent) {
      depth += 1;
      curr = curr.parentNode;
    }
    return depth;
  }

  function prevElement(elem) {
    var curr = elem;
    var prev = curr.previousElementSibling;
    while (prev === null) {
      curr = curr.parentNode;
      prev = curr.previousElementSibling;
    }
    return prev;
  }

  function nextElement(elem) {
    var curr = elem;
    var next = curr.nextElementSibling;
    while (next === null) {
      curr = curr.parentNode;
      next = curr.nextElementSibling;
    }
    return next;
  }

  function prevElementCousin(elem) {
    var curr = elem;
    var depth = 0;
    var prev = curr.previousElementSibling;
    while (prev === null) {
      curr = curr.parentNode;
      if (curr === container)
        return null;
      prev = curr.previousElementSibling;
      depth -= 1;
    }
    curr = prev;
    var child = curr;
    while (depth < 0) {
      child = curr.lastElementChild;
      if (child == null) {
        child = curr;
        break;
      }
      curr = child;
      depth += 1;
    }
    return child;
  }

  function nextElementCousin(elem) {
    var curr = elem;
    var depth = 0;
    var next = curr.nextElementSibling;
    while (next === null) {
      curr = curr.parentNode;
      if (curr === document.body)
        return null;
      next = curr.nextElementSibling;
      depth -= 1;
    }
    curr = next;
    var child = curr;
    while (depth < 0) {
      child = curr.firstElementChild;
      if (child == null) {
        child = curr;
        break;
      }
      curr = child;
      depth += 1;
    }
    return child;
  }

  //====================================
  //  onscreen datastructure helpers
  //====================================

  function calcDeepestOnscreen() {
    var firstOnscreenDepth = getOnscreenDepth(g.firstOnscreen);
    var lastOnscreenDepth = getOnscreenDepth(g.lastOnscreen);

    g.deepestFirstOnscreen = g.firstOnscreen[firstOnscreenDepth - 1];
    g.deepestLastOnscreen = g.lastOnscreen[lastOnscreenDepth - 1];
  }

  function calcDeepestLastOnscreen() {
    var firstOnscreenDepth = getOnscreenDepth(g.last.firstOnscreen);
    var lastOnscreenDepth = getOnscreenDepth(g.last.lastOnscreen);

    g.last.deepestFirstOnscreen = g.last.firstOnscreen[firstOnscreenDepth - 1];
    g.last.deepestLastOnscreen = g.last.lastOnscreen[lastOnscreenDepth - 1];
  }

  function getOnscreenDepth(onscreen) {
    var depth = 1;
    while (depth < onscreen.length && onscreen[depth] !== null)
      depth += 1;
    return depth;
  }

  // returns true if update took place
  function updateOnscreen(onscreen, oldNode, newNode) {
    for (var i = 0; i < onscreen.length; i++) {
      if (onscreen[i] == oldNode) {
        onscreen[i] = newNode;
        for (var j = i + 1; j < onscreen.length; j++) {
          onscreen[j] = null;
        }
        return true;
      }
    }
    return false;
  }

  //====================================
  //  helpers
  //====================================

  function safeOnscreenCallback(child, depth) {
      try {
        onscreenCallback(child, depth);
      }
      catch (e) {
        console.warn('monitorMultilevelChildVisiblity: ' +
                     'Exception in onscreenCallback:',
                     e, e.stack);
      }
  }

  function safeOffscreenCallback(child, depth) {
      try {
        offscreenCallback(child, depth);
      }
      catch (e) {
        console.warn('monitorMultilevelChildVisiblity: ' +
                     'Exception in onscreenCallback:',
                     e, e.stack);
      }
  }

  function reset() {
    for (var i = 0; i < maxDepth; i++) {
      g.firstOnscreen[i] = null;
      g.lastOnscreen[i] = null;
      g.last.firstOnscreen[i] = null;
      g.last.lastOnscreen[i] = null;
    }
    g.deepestFirstOnscreen = null;
    g.deepestLastOnscreen = null;
    g.last.deepestFirstOnscreen = null;
    g.last.deepestLastOnscreen = null;
  }

  //====================================
  //  management
  //====================================

  function pauseMonitoringMutations() {
    g.observer.disconnect();
  }

  function resumeMonitoringMutations() {
    if (g.stopped)
      return;
    g.observer.observe(container, { childList: true, subtree: true });
  }

  function stopMonitoring() {
    container.removeEventListener('scroll', scrollHandler);
    window.removeEventListener('resize', updateVisibility);
    g.observer.disconnect();
    g.stopped = true;
  }

  //====================================
  //  initialization + return
  //====================================

  init();

  return {
    pauseMonitoringMutations: pauseMonitoringMutations,
    resumeMonitoringMutations: resumeMonitoringMutations,
    stop: stopMonitoring
  };
}
