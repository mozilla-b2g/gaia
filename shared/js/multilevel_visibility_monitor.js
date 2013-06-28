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
    true,
    tagName,
    function(elem, depth) {
      onscreenCallback(elem, depth);
    },
    function(elem, depth) {
      offscreenCallback(elem, depth);
    });
}

function monitorChildWithTagVisibility(
  container,
  scrollMargin,
  scrollDelta,
  maxDepth,
  notifyOnlyAtMaxDepth,
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
    notifyOnlyAtMaxDepth,
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
                         true,
                         onscreenCallback,
                         offscreenCallback);
}

/*====================================
  MonitorMultilevelChildVisibility
    generalized function to watch children of a container at any depth level
    returns object containing stop function

    ------------------------------------

    terminology
      - child: any descendent of a node

    ------------------------------------

    arguments
      container,
      scrollMargin
        - how close an element needs to be to the container edge to be
          considered onscreen
      scrollDelta,
        - how much the container needs to be scrolled before onscreen
          and offscreen are recalculated
        - higher value means callbacks fired less frequently, but there
          are more of them when they are fired
      maxDepth
        - max depth from container to monitor (1 === direct children)
      notifyOnlyAtMaxDepth
        - instead of giving events for each depth level, only notify at the
          at the max depth level. Helps for performance and is useful for
          filtering
      onscreenCallback,
        - called with
            1) the element that is now onscreen
            2) the depth of that element
      offscreenCallback
        - called with
            1) the element that is now offscreen
            2) the depth of that element

    ------------------------------------

    returns an object with the following properties:
        pauseMonitoringMutations
          - a function, that when called, disables mutation monitoring
        resumeMonitoringMutations
          - a function, that when called, enables mutation monitoring
        stop
          - a funtion, that when called, stops and cleans up the module instance
          - performs full visibility update if first argument is true

    ------------------------------------

    assumptions
      children flow top to bottom
      children are not absolutely positioned
      children do not move on their own
      children don't change size or become hidden
      the container is not statically positioned
      the container element only changes size on a resize event

    ------------------------------------

    performance
      - if you can, when adding a node to the dom, add children to the node
        before adding the node to the dom.
      - if you're certain a change won't change visibility, surround it with
        calls to pause and resume monitoring mutations.

    ------------------------------------

    high level overview of implementation
      more details can be found in comments closer to the implementation itself

      the central algorithm contains 2 stages
        1) visibility computation (recomputeFirstAndLastOnscreen)
          - computing the first and last visible element
        2) notification of offscreen / onscreen (callCallbacks)
          - notifying elements whose visibility has changed

        - the central algorithm is triggered whenever an event is received that
          suggests the visibility may have changed
            - onscroll
            - onresize
            - mutation of any child (mutation observer)

====================================*/

function monitorMultilevelChildVisibility(
  container,
  scrollMargin,
  scrollDelta,
  maxDepth,
  notifyOnlyAtMaxDepth,
  onscreenCallback,
  offscreenCallback
) {

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
    g.pendingCallCallbacksTimeoutId = null;
    g.stopped = false;
    g.last = {
      scrollTop: -1
    };
    g.last.firstOnscreen = new Array(maxDepth);
    g.last.lastOnscreen = new Array(maxDepth);
    reset();

    //add events that could trigger an element to go onscreen or offscreen
    container.addEventListener('scroll', scrollHandler);
    window.addEventListener('resize', onresize);
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

  function onresize(event) {
    updateVisibility();
  }

  function mutationHandler(mutations) {
    if (container.clientHeight === 0) { //container hidden
      return;
    }

    if (container.firstElementChild === null) { //container empty
      reset();
      return;
    }

    // synchronize if necessary, we might have to manipulate the model outside
    // of callCallbacks
    if (g.pendingCallCallbacksTimeoutId !== null)
      callCallbacks();

    // there are times when we won't be able to use a removed node. We can't
    // hash based on just the node, so instead we give the node a key and use
    // that.
    var removedNodes = {};
    var removedNodeIndexKey = '__MultilevelVisibilityMonitorRemovedIndex__' +
                              Math.random() + '__';
    function constructRemovedNodes() {
      var removedNodeIndex = 0;
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.removedNodes) {
          for (var j = 0; j < mutation.removedNodes.length; j++) {
            var child = mutation.removedNodes[j];
            child[removedNodeIndexKey] = removedNodeIndex;
            removedNodes[removedNodeIndex] = mutation;
            removedNodeIndex += 1;
          }
        }
      }
    }
    constructRemovedNodes();

    // returns whether a node was removed by looking at it and its parents
    function getRemoved(child) {
      var curr = child;
      while (curr !== container) {
        if (removedNodes[curr[removedNodeIndexKey]]) {
          return removedNodes[curr[removedNodeIndexKey]];
        }
        curr = curr.parentNode;
      }
      return null;
    }

    // the point of this is to fix state - we might be keeping track of the
    //  visible range using a node that's been deleted
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.removedNodes) {
        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var child = mutation.removedNodes[j];

          if (child.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          var prev = mutation.previousSibling;
          var next = mutation.nextSibling;

          // we can't use a removed node in the childRemoved step, and prev
          // might have been removed
          while (prev !== null && getRemoved(prev) !== null) {
            prev = getRemoved(prev).previousSibling;
          }

          // we can't use a removed node in the childRemoved step, and next
          // might have been removed
          while (next !== null && getRemoved(next) !== null) {
            next = getRemoved(next).nextSibling;
          }

          childRemoved(child, next, prev);
        }
      }
    }

    // now that state's fixed we can recompute what's visible and notify
    //  the client
    recomputeFirstAndLastOnscreen();
    callCallbacks();

    //notify onscreen added children that they're onscreen
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var child = mutation.addedNodes[j];
          if (
              child.nodeType === Node.ELEMENT_NODE &&
              getRemoved(child) == null
          ) {
            childAdded(child);
          }
        }
      }
    }
  }

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
              g.firstOnscreen.indexOf(child) !== -1 ||
              after(child, g.deepestFirstOnscreen)
    ) {
      var depth = getDistance(container, child);
      if (depth <= maxDepth) {
        safeOnscreenCallback(child, depth);
      }
    }
  }

  function childRemoved(child, next, prev) {
    if (prev) {
      while (
             prev.lastElementChild !== null &&
             getDistance(container, prev.lastElementChild) <= maxDepth
      ) {
        prev = prev.lastElementChild;
      }
    }

    if (next) {
      while (
             next.firstElementChild !== null &&
             getDistance(container, next.firstElementChild) <= maxDepth
      ) {
        next = next.firstElementChild;
      }
    }

    var wasUpdate = false;
    if (updateOnscreen(g.firstOnscreen, child, next))
      wasUpdate = true;
    if (updateOnscreen(g.lastOnscreen, child, prev))
      wasUpdate = true;
    if (wasUpdate)
      calcDeepestOnscreen();

    wasUpdate = false;
    if (updateOnscreen(g.last.firstOnscreen, child, next))
      wasUpdate = true;
    if (updateOnscreen(g.last.lastOnscreen, child, prev))
      wasUpdate = true;
    if (wasUpdate)
      calcDeepestLastOnscreen();
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
  //    - this algorithm tries to minimize the number of dom nodes traversed,
  //      while still finding the deepest first and last elements onscreen
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
      var nextFirstOnscreen = recomputeFirstOnscreenSibling(g.firstOnscreen[i]);
      if (nextFirstOnscreen !== g.firstOnscreen[i]) {
        g.firstOnscreen[i] = nextFirstOnscreen;
        // invalidate guesses below this level
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
        if (i == 0) {
          g.lastOnscreen[i] = g.firstOnscreen[i];
        }
        else {
          g.lastOnscreen[i] = currentContainer.firstElementChild;
        }
        if (g.lastOnscreen[i] === null)
          break;
      }
      var nextLastOnscreen = recomputeLastOnscreenSibling(g.lastOnscreen[i]);
      if (nextLastOnscreen !== g.lastOnscreen[i]) {
        g.lastOnscreen[i] = nextLastOnscreen;
        // invalidate guesses below this level
        for (var j = i + 1; j < maxDepth; j++) {
          g.lastOnscreen[j] = null;
        }
      }
      currentContainer = g.lastOnscreen[i];
    }
  }

  function recomputeFirstOnscreenSibling(guessOfFirstOnscreen) {
    var currentFirstOnscreen = guessOfFirstOnscreen;
    // move until we're past the target
    while (relativeVisibilityPosition(container,
                                      currentFirstOnscreen) !== BEFORE) {
      var prev = currentFirstOnscreen.previousElementSibling;
      if (prev === null)
        break;
      currentFirstOnscreen = prev;
    }
    // move towards the target
    while (relativeVisibilityPosition(container,
                                      currentFirstOnscreen) === BEFORE) {
      var next = currentFirstOnscreen.nextElementSibling;
      if (next === null)
        break;
      currentFirstOnscreen = next;
    }
    return currentFirstOnscreen;
  }

  function recomputeLastOnscreenSibling(guessOfLastOnscreen) {
    var currentLastOnscreen = guessOfLastOnscreen;
    // move until we're past the target
    while (relativeVisibilityPosition(container,
                                      currentLastOnscreen) !== AFTER) {
      var next = currentLastOnscreen.nextElementSibling;
      if (next === null)
        break;
      currentLastOnscreen = next;
    }
    // move towards the target
    while (relativeVisibilityPosition(container,
                                      currentLastOnscreen) === AFTER) {
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
      // nothing on screen, nothing to do
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
        notifyOnscreenInRange(g.deepestFirstOnscreen, cousin, BEFORE);
        if (!notifyOnlyAtMaxDepth) {
          var closestPrev = prevElement(g.last.deepestFirstOnscreen);
          if (closestPrev !== cousin)
            notifyOnscreenInRange(cousin, closestPrev, BEFORE);
        }
      }
      // onscreen at bottom
      if (after(g.deepestLastOnscreen, g.last.deepestLastOnscreen)) {
        var cousin = nextElementCousin(g.last.deepestLastOnscreen);
        notifyOnscreenInRange(cousin, g.deepestLastOnscreen, AFTER);
        if (!notifyOnlyAtMaxDepth) {
          var closestNext = nextElement(g.last.deepestLastOnscreen);
          if (closestNext !== cousin)
            notifyOnscreenInRange(closestNext, cousin, AFTER);
        }
      }
      // offscreen at top
      if (after(g.deepestFirstOnscreen, g.last.deepestFirstOnscreen)) {
        var cousin = prevElementCousin(g.deepestFirstOnscreen);
        notifyOffscreenInRange(g.last.deepestFirstOnscreen, cousin, BEFORE);
        if (!notifyOnlyAtMaxDepth) {
          var closestPrev = prevElement(g.deepestFirstOnscreen);
          if (closestPrev !== cousin)
            notifyOffscreenInRange(cousin, closestPrev, BEFORE);
        }
      }
      // offscreen at bottom
      if (before(g.deepestLastOnscreen, g.last.deepestLastOnscreen)) {
        var cousin = nextElementCousin(g.deepestLastOnscreen);
        notifyOffscreenInRange(cousin, g.last.deepestLastOnscreen, AFTER);
        if (!notifyOnlyAtMaxDepth) {
          var closestNext = nextElement(g.deepestLastOnscreen);
          if (closestNext !== cousin)
            notifyOffscreenInRange(closestNext, cousin, AFTER);
        }
      }

    }

    g.last.firstOnscreen = copyArray(g.firstOnscreen);
    g.last.lastOnscreen = copyArray(g.lastOnscreen);
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

    var stopBottom = null;
    if (boundDir === BEFORE)
      stopBottom = stop.offsetTop + stop.clientHeight;
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
  function relativeVisibilityPosition(container, child) {

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
    if (!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      return false;
    }
    if (getDistance(a, b) !== null || getDistance(b, a) !== null) {
      return false;
    }
    return true;
  }

  function after(a, b) {
    if (!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING)) {
      return false;
    }
    if (getDistance(a, b) !== null || getDistance(b, a) !== null) {
      return false;
    }
    return true;
  }

  function getDistance(parent, child) {
    var depth = 0;
    var curr = child;
    while (curr !== parent) {
      depth += 1;
      if (curr == null) {
        return null;
      }
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

  // while prevElement computes the closest element in terms of the dom,
  //  prevElementCousin computes that element, then computes the closest
  //  child of that element.
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

  // while nextElement computes the closest element in terms of the dom,
  //  nextElementCousin computes that element, then computes the closest
  //  child of that element.
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

        if (newNode === null) {
          for (var j = i; j < onscreen.length; j++) {
            onscreen[j] = null;
          }
        }
        else {
          var index = getDistance(container, newNode) - 1;
          for (var j = onscreen.length - 1; j > index; j--) {
            onscreen[j] = null;
          }
          for (var j = index; j >= 0; j--) {
            onscreen[j] = newNode;
            newNode = newNode.parentNode;
          }
        }

        return true;
      }
    }
    return false;
  }

  //====================================
  //  helpers
  //====================================

  function copyArray(array) {
    return array.slice(0);
  }

  function safeOnscreenCallback(child, depth) {
    if (notifyOnlyAtMaxDepth && depth !== maxDepth)
      return;
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
    if (notifyOnlyAtMaxDepth && depth !== maxDepth)
      return;
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

  function resumeMonitoringMutations(forceVisibilityUpdate) {
    if (g.stopped)
      return;
    g.observer.observe(container, { childList: true, subtree: true });

    if (forceVisibilityUpdate) {
      reset();
      updateVisibility(true);
    }
  }

  function stopMonitoring() {
    container.removeEventListener('scroll', scrollHandler);
    window.removeEventListener('resize', onresize);
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
