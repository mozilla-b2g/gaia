
/*====================================
  monitorTagVisibility
    generalized function to watch children of a container

    ------------------------------------

    terminology
      - child: any descendent of a node

    ------------------------------------

    arguments
      container
        - the scrollable element we want to monitor the children of
      tag
        - the tag to monitor
      scrollMargin
        - how close an element needs to be to the container edge to be
          considered onscreen
      scrollDelta,
        - how much the container needs to be scrolled before onscreen
          and offscreen are recalculated
        - higher value means callbacks fired less frequently, but there
          are more of them when they are fired
      onscreenCallback,
        - called with the element that is now onscreen
      offscreenCallback
        - called with the element that is now offscreen

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

function monitorTagVisibility(
  container,
  tag,
  scrollMargin,
  scrollDelta,
  onscreenCallback,
  offscreenCallback
) {

  // we need offsetTop to work properly, which will only happen if the container
  // is not position: static
  if (container.style.position === 'static') {
    console.warn(
          'MonitorTagVisibility:' +
          '"position: static" containers not supported,' +
          ' maybe use "position: relative"?');
  }

  tag = tag.toUpperCase();

  var state;

  var FORWARDS = 1;
  var BACKWARDS = -1;

  var BEFORE = -1;
  var ON = 0;
  var AFTER = 1;

  //====================================
  //  init
  //====================================

  function init() {
    state = {
      scrollTop: -1,
      pendingCallCallbacksTimeoutId: null,
      prev: {}
    };

    window.addEventListener('resize', resizeHandler);
    container.addEventListener('scroll', scrollHandler);
    state.observer = new MutationObserver(mutationHandler);
    state.observer.observe(container, { childList: true, subtree: true });

    // we use this to keep track of the relevent children of the container
    //  - because its a live node list, the indices may change, but the
    //    variable will always contain everything
    state.children = container.getElementsByTagName(tag);
    reset();

    updateVisibility(true);
  }

  function reset() {
    state.firstChildIndex = null;
    state.lastChildIndex = null;
    state.firstChild = null;
    state.lastChild = null;
    state.prev.firstChildIndex = null;
    state.prev.lastChildIndex = null;
  }

  //====================================
  //  event handlers
  //====================================

  function resizeHandler() {
    updateVisibility();
  }

  function scrollHandler() {
    var scrollTop = container.scrollTop;
    if (Math.abs(scrollTop - state.prev.scrollTop) < scrollDelta) {
      return;
    }
    state.prev.scrollTop = scrollTop;

    updateVisibility();
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
      // otherwise, as scrollDelta = 0, there's going to be a lot of callbacks
      deferCallingCallbacks();
    }
  }

  //====================================
  //  mutation
  //====================================

  function mutationHandler(mutations) {
    // some of the removals may have messed with our first/last child on screen
    fixRange(mutations);

    // check if anything we add needs to be notified as onscreen
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var child = mutation.addedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE &&
              child.tagName === tag) {
            if (child === state.firstChild ||
                child === state.lastChild ||
                (after(child, state.firstChild) &&
                before(child, state.lastChild))
            ) {
              safeOnscreenCallback(child);
            }
          }
        }
      }
    }
  }

  // -------------------------------
  //  fixRange
  //    fixes state if it doesn't match the new dom state
  //    - as we keep track of indices, adding and deleting indices changes what
  //      element we meant to point to
  function fixRange(mutations) {
    var firstAfterScreen = (state.lastChildIndex < state.children.length - 1) ?
                           state.children[state.lastChildIndex + 1] : null;
    var nodesAddedAfterScreen = true;
    var numNodesAdded = 0;
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var child = mutation.addedNodes[j];
          if (child.nodeType === Node.ELEMENT_NODE &&
            child.tagName === tag) {
            numNodesAdded += 1;
            // Determine if this new child is being appended below the
            // currently visible area.  This check assumes no nodes were
            // removed.  If any node is not an append, then we must follow
            // the slow path below.
            if (!firstAfterScreen || !after(child, firstAfterScreen)) {
              nodesAddedAfterScreen = false;
            }
          }
        }
      }
    }

    // if a node was deleted, we'll have to use its sibling, but what if its
    //  sibling is deleted? Then we need the mutation event for that sibling
    //  so we can get its sibling. Using WeakMaps allow us to use the deleted
    //  node as a key to get the mutation for that deleted node
    var removedNodes = new WeakMap();
    var nodesRemoved = false;
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.removedNodes) {
        for (var j = 0; j < mutation.removedNodes.length; j++) {
          var child = mutation.removedNodes[j];
          removedNodes.set(child, mutation);
          nodesRemoved = true;
        }
      }
    }

    // If we are only appending after the visible region, then we can skip
    // the rest of the work here.  This is a big win since calling
    // recomputeFirstAndLastOnscreen() below can trigger visibility triggers
    // sync reflows. Note, we can only trust our append detection here if
    // no nodes were removed.
    if (!nodesRemoved && nodesAddedAfterScreen) {
      return;
    }

    // -------------------------------
    //  fixIndex
    //    takes a possibly invalid index, and returns the next valid index
    //    - if the node at our index (target) was deleted, we have to find
    //      the next valid element, and get the index for that element
    //    - to ensure that the elements are calculated correctly we have to
    //      search in a different direction for the last and first onscreen
    //      chidlren
    function fixIndex(index, target, dir) {
      var sibling;
      if (dir == FORWARDS)
        sibling = 'nextSibling';
      else
        sibling = 'previousSibling';
      while (target !== null &&
             removedNodes.has(target)
      ) {
        target = removedNodes.get(target)[sibling];
      }
      var limit = getLimit(dir);
      if (dir == FORWARDS && index > limit)
        index = limit;
      while (state.children[index] !== target && index !== limit)
        index += dir;
      return index;
    }

    // Why +/- numNodesAdded?
    //  if going backwards + nodes were added after target node, we add
    //    to the start index so we don't miss the desired node
    //  if going forwards + nodes were added before target node, we sub
    //    from the start so we don't miss the desired node
    state.firstChildIndex =
        fixIndex(state.firstChildIndex - numNodesAdded,
                 state.firstChild, FORWARDS);
    state.lastChildIndex =
        fixIndex(state.lastChildIndex + numNodesAdded,
                 state.lastChild, BACKWARDS);
    state.prev.firstChildIndex =
        fixIndex(state.prev.firstChildIndex - numNodesAdded,
                 state.prev.firstChild, FORWARDS);
    state.prev.lastChildIndex =
        fixIndex(state.prev.lastChildIndex + numNodesAdded,
                 state.prev.lastChild, BACKWARDS);

    recomputeFirstAndLastOnscreen();
    callCallbacks();
  }

  //====================================
  //  visibility computation
  //====================================

  //---------------------------------------
  //  recomputeFirstAndLastOnscreen
  //    find the elements that are the first/last child on screen
  //    - to make this faster, we use the last first/last child on screen as a
  //      guess for where to start looking
  //
  //  NOTE: Calling recomputeFirstAndLastOnscreen() can trigger a sync reflow
  //        by calling computeBorderVisibilityIndex().
  function recomputeFirstAndLastOnscreen() {

    if (state.children.length === 0) {
      state.firstChildIndex = null;
      state.lastChildIndex = null;
      return;
    }

    var firstChildIndexGuess = state.prev.firstChildIndex;
    var lastChildIndexGuess = state.prev.lastChildIndex;
    if (state.prev.firstChildIndex === null) {
      firstChildIndexGuess = 0;
    }
    if (state.prev.lastChildIndex === null) {
      lastChildIndexGuess = state.children.length - 1;
    }

    state.firstChildIndex =
        computeBorderVisibilityIndex(firstChildIndexGuess, BEFORE, BACKWARDS);
    state.lastChildIndex =
        computeBorderVisibilityIndex(lastChildIndexGuess, AFTER, FORWARDS);

    state.firstChild = state.children[state.firstChildIndex];
    state.lastChild = state.children[state.lastChildIndex];
  }

  // NOTE: Calling computeBorderVisibilityIndex() can trigger a sync reflow
  //       by calling relativeVisibilityPosition().
  function computeBorderVisibilityIndex(guess, visibilityPosition, dir) {
    // move in direction past container
    var limit = getLimit(dir);
    while (relativeVisibilityPosition(container, state.children[guess]) !==
           visibilityPosition) {
      if (guess === limit)
        break;
      guess += dir;
    }
    // move back towards container
    limit = getLimit(-dir);
    while (relativeVisibilityPosition(container, state.children[guess]) ===
           visibilityPosition) {
      if (guess === limit)
        break;
      guess += -dir;
    }
    return guess;
  }

  function deferCallingCallbacks() {
    if (state.pendingCallCallbacksTimeoutId !== null) {
      // take it off before putting it back on, we want to ensure its on the
      //  back of the event queue
      window.clearTimeout(state.pendingCallCallbacksTimeoutId);
    }
    state.pendingCallCallbacksTimeoutId = setTimeout(callCallbacks, 0);
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
  function callCallbacks() {

    if (state.pendingCallCallbacksTimeoutId !== null) {
      window.clearTimeout(state.pendingCallCallbacksTimeoutId);
      state.pendingCallCallbacksTimeoutId = null;
    }

    if (state.firstChildIndex === null || state.lastChildIndex === null) {
      // nothing on screen, nothing to do
    }
    else if (
              state.prev.firstChildIndex === null ||
              state.prev.lastChildIndex === null
    ) {
      notifyOnscreenInRange(state.firstChildIndex, state.lastChildIndex);
    }
    else if (
      state.lastChildIndex < state.prev.firstChildIndex ||
      state.firstChildIndex > state.prev.lastChildIndex
    ) { // disjoint
      notifyOnscreenInRange(state.firstChildIndex,
                            state.lastChildIndex);
      notifyOffscreenInRange(state.prev.firstChildIndex,
                            state.prev.lastChildIndex);
    }
    else { // overlapping
      // onscreen at top
      if (state.firstChildIndex < state.prev.firstChildIndex)
        notifyOnscreenInRange(state.firstChildIndex,
                              state.prev.firstChildIndex - 1);
      // onscreen at bottom
      if (state.lastChildIndex > state.prev.lastChildIndex)
        notifyOnscreenInRange(state.prev.lastChildIndex + 1,
                              state.lastChildIndex);
      // offscreen at top
      if (state.firstChildIndex > state.prev.firstChildIndex)
        notifyOffscreenInRange(state.prev.firstChildIndex,
                               state.firstChildIndex - 1);
      // offscreen at bottom
      if (state.lastChildIndex < state.prev.lastChildIndex)
        notifyOffscreenInRange(state.lastChildIndex + 1,
                               state.prev.lastChildIndex);
    }

    state.prev.firstChildIndex = state.firstChildIndex;
    state.prev.lastChildIndex = state.lastChildIndex;
    state.prev.firstChild = state.firstChild;
    state.prev.lastChild = state.lastChild;
  }

  //====================================
  //  dom helpers
  //====================================

  // NOTE: Calling relativeVisibilityPosition() can trigger a sync reflow
  //       by touching scrollTop and offsetTop.
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
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function after(a, b) {
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  //====================================
  //  helpers
  //====================================

  function getLimit(dir) {
    if (dir === 1)
      return Math.max(0, state.children.length - 1);
    else
      return 0;
  }

  function notifyOnscreenInRange(start, stop) {
    notifyInRange(start, stop, safeOnscreenCallback);
  }

  function notifyOffscreenInRange(start, stop) {
    notifyInRange(start, stop, safeOffscreenCallback);
  }

  function notifyInRange(start, stop, fn) {
    for (var i = start; i <= stop; i++) {
      fn(state.children[i]);
    }
  }

  function safeOnscreenCallback(child) {
    try {
      onscreenCallback(child);
    }
    catch (e) {
      console.warn('monitorTagVisiblity: ' +
                   'Exception in onscreenCallback:',
                   e, e.stack);
    }
  }

  function safeOffscreenCallback(child) {
    try {
      offscreenCallback(child);
    }
    catch (e) {
      console.warn('monitorTagVisiblity: ' +
                   'Exception in offscreenCallback:',
                   e, e.stack);
    }
  }

  //====================================
  //  API
  //====================================

  function pauseMonitoringMutations() {
    state.observer.disconnect();
  }

  function resumeMonitoringMutations(forceVisibilityUpdate) {
    if (state.stopped)
      return;
    state.observer.observe(container, { childList: true, subtree: true });

    if (forceVisibilityUpdate) {
      reset();
      updateVisibility(true);
    }
  }

  function stopMonitoring() {
    container.removeEventListener('scroll', scrollHandler);
    window.removeEventListener('resize', onresize);
    state.observer.disconnect();
    state.stopped = true;
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
