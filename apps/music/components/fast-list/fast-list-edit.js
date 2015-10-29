!(function(define){'use strict';define(function(require,exports,module){

/**
 * Mini logger
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console, '[FastList<>Edit]') : function() {};

// Pointer/touch abstraction
var startEvent = ('ontouchstart' in window) ? 'touchstart' : 'mousedown';
var moveEvent = ('ontouchstart' in window) ? 'touchmove' : 'mousemove';
var endEvent = ('ontouchstart' in window) ? 'touchend' : 'mouseup';

var schedule = FastList.scheduler;

/**
 * Exports
 */

exports = module.exports = fastListEdit;

function fastListEdit(list) {
  list.editing = false;

  /**
   * Toggles the edit mode on and off
   *
   * Returns the DomScheduler promise of the edit mode transition
   *
   * @return {Promise}
   */
  list.toggleEditMode = function() {
    list.editing = !list.editing;

    if (list.editing) list._startTouchListeners();
    else list._stopTouchListeners();

    return toggleEditClass(
      list.els.itemContainer,
      list.els.itemsInDOM,
      list.editing
    );
  };

  list._startTouchListeners = function() {
    on(list.els.itemContainer, startEvent, list.handleEventEdit);
    on(list.els.itemContainer, endEvent, list.handleEventEdit);
  };

  list._stopTouchListeners = function() {
    off(list.els.itemContainer, startEvent, list.handleEventEdit);
    off(list.els.itemContainer, endEvent, list.handleEventEdit);
  };

  list.handleEventEdit = function(evt) {
    switch (evt.type) {
      case startEvent:
        if (!evt.target.classList.contains('cursor')) {
          return;
        }
        evt.preventDefault();
        list._reorderStart(evt);
        break;
      case endEvent:
        if (!evt.target.classList.contains('cursor') &&
            endEvent === 'touchend') {
          return;
        }
        evt.preventDefault();
        list._reorderEnd(evt);
        break;
    }
  };

  /**
   * Starts the reordering gestures
   *
   * - initializes the reordering context (state)
   * - attaches (see DomScheduler) a block to the move events
   * - sets up the css to make the dragged element pop up
   *
   * @param {TouchEvent} evt the touchstart event
   */
  list._reorderStart = function(evt) {
    debug('reorder start');
    var ctx = list.reorderingContext;

    // Already tracking an item, bailing out
    if (ctx.item) return;

    var li = evt.target.parentNode.parentNode;
    var touch = evt.touches && evt.touches[0] || evt;

    ctx.item = li;
    ctx.initialY = touch.pageY;
    ctx.identifier = touch.identifier;
    ctx.moveUp = new Set();
    ctx.moveDown = new Set();
    ctx.moveHandler = list._reorderMove.bind(list);

    var listenToMove = (function() {
      schedule.attachDirect(
        list.els.itemContainer,
        moveEvent,
        ctx.moveHandler);
    }).bind(list);

    setupForDragging(li, true)
      .then(listenToMove)
      .then(toggleDraggingClass.bind(null, li, true));
  };

  /**
   * Scheduled callback for move events during reordering
   *
   * - updates the position of the dragged item
   * - rearranges the other items
   *
   * @param {TouchEvent} evt the touchmove event
   */
  list._reorderMove = function(evt) {
    debug('reorder move');
    var ctx = list.reorderingContext;
    if (!ctx.item) return;

    // Multi touch
    if (evt.touches && evt.touches.length > 1) return;

    var li = ctx.item;
    var touch = evt.touches && evt.touches[0] || evt;
    var position = touch.pageY;
    var delta = position - ctx.initialY;

    list._rearrange(delta);
    tweakTransform(li, delta);

    // TODO: scroll when close to the beginning/end of the viewport
  };

  /**
   * Rearranges the items below te dragged one
   *
   * - computes the transitions needed based on the context
   * - triggers scheduled transitions for each one
   *
   * @param {Number} delta the distance traveled by the reordering gesture
   */
  list._rearrange = function(delta) {
    debug('rearrange', delta);

    var ctx = list.reorderingContext;
    var upCount = ctx.moveUp.size;
    var downCount = ctx.moveDown.size;

    computeChanges(
      list.reorderingContext,
      list.geometry,
      list.els.itemsInDOM,
      delta
    );

    if (ctx.moveUp.size === upCount &&
        ctx.moveDown.size === downCount) {
      return;
    }

    applyChanges(
      list.reorderingContext,
      list.geometry,
      list.els.itemsInDOM
    );

    debug('rearranged');
  };

  /**
   * Ends the reordering gesture
   *
   * - computes any remaining pending changes
   * - detaches the block from the move events
   * - schedules a transition to move the dragged item in place
   * - schedules a transition to move other items in place
   *
   * @param {TouchEvent} evt the touchend event
   */
  list._reorderEnd = function(evt) {
    debug('reorder end');

    var ctx = list.reorderingContext;
    var li = ctx.item;

    if (!li) return;

    schedule.detachDirect(
      list.els.itemContainer,
      moveEvent,
      ctx.moveHandler);

    var touch = evt.touches && evt.touches[0] || evt;
    if (touch.identifier == ctx.identifier) {
      var position = touch.pageY;
      var delta = position - ctx.initialY;
      computeChanges(ctx, list.geometry, list.els.itemsInDOM, delta);
    }

    Promise.all([
      applyChanges(ctx, list.geometry, list.els.itemsInDOM),
      moveInPlace(ctx, list.geometry)
    ]).then(list._reorderFinish.bind(list, li))
      .then(toggleDraggingClass.bind(null, li, false));
  };

  /**
   * Final stage of the reordering
   *
   * In parallell
   * - Commits the change to the document
   * - cleans up the css on the dragged element
   *
   */
  list._reorderFinish = function(li) {
    return Promise.all([
      list._commitToDocument(),
      setupForDragging(li, false)
    ]);
  };

  /**
   * Commits the reordering changes to the document
   *
   * Inside a scheduled mutation
   * - re-renders the list with the new ordering
   * - cleans up the reordering context
   *
   */
  list._commitToDocument = function() {
    debug('commit to document');
    var ctx = list.reorderingContext;
    var li = ctx.item;
    var itemsInDOM = list.els.itemsInDOM;
    var items = list.els.items;
    var source = list.source;

    return schedule.mutation((function() {
      // Nothing to do
      if (!ctx.moveUp && !ctx.moveDown) {
        return;
      }

      var index = items.indexOf(li);
      var section = li.dataset.section;
      var newIndex = index + ctx.moveUp.size - ctx.moveDown.size;

      items.splice(index, 1);
      items.splice(newIndex, 0, li);
      var c = source.removeAtIndex(index);
      source.insertAtIndex(newIndex, c, section);

      itemsInDOM.forEach(function(item) {
        resetTransition(item);
        resetTransform(item);
      });

      list.updateSections();
      list.render();

      ctx.item = null;
      ctx.initialY = null;
      ctx.identifier = null;
      ctx.moveUp = null;
      ctx.moveDown = null;
      ctx.moveHandler = null;
    }).bind(list));
  };
}

/**
 * Internals
 */

function resetTransform(item) {
  debug('reset transform');
  var position = parseInt(item.dataset.position);
  item.style.webkitTransform =
    item.style.transform = 'translateY(' + position + 'px)';
  item.dataset.tweakDelta = '';
}

function tweakTransform(item, delta) {
  debug('tweak transform', delta);
  var position = ~~item.dataset.position + delta;
  item.style.webkitTransform =
    item.style.transform = 'translateY(' + position + 'px)';
  item.dataset.tweakDelta = delta;
}

function resetTransition(item) {
  item.style.transition = '';
  item.style.webkitTransition = '';
}

function tweakAndTransition(item, tweak) {
  return schedule.feedback(function() {
    debug('tweak and transition', item, tweak);
    item.style.transition = 'transform 0.15s ease';
    item.style.webkitTransition = '-webkit-transform 0.15s ease';
    if (tweak === 0) {
      setTimeout(resetTransform.bind(null, item));
      return;
    }
    setTimeout(tweakTransform.bind(null, item, tweak));
  }, item, 'transitionend')
  .then(resetTransition.bind(null, item));
}

function toggleEditClass(list, domItems, editing) {
  if (!domItems.length) return Promise.resolve();

  return schedule.feedback(function() {
    for (var i = 0; i < domItems.length; i++) {
      var item = domItems[i];
      var overlay = item.querySelector('.overlay');
      overlay.dataset.anim = editing ? 'reveal' : 'hide';
      item.classList.toggle('edit', editing);
    }
  }, list, 'animationend');
}

function setupForDragging(item, on) {
  return schedule.mutation(function() {
    item.parentNode.classList.toggle('reordering', on);
    item.style.zIndex = on ? '1000' : '';
    item.style.boxShadow = on ? '0 0 3px 1px #bcbcbc' : '';
  });
}

function toggleDraggingClass(item, on) {
  return schedule.feedback(function() {
    var overlay = item.querySelector('.overlay');
    overlay.dataset.anim = on ? 'hide' : 'reveal';
  }, item, 'animationend');
}

function computeChanges(context, geometry, domItems, delta) {
  if (!context.item) return;

  var draggedItem = context.item;
  var draggedOriginal = parseInt(draggedItem.dataset.position);
  var draggedTweaked = draggedOriginal + delta;

  for (var i = 0; i < domItems.length; i++) {
    var item = domItems[i];
    if (item === draggedItem) continue;

    // TODO: support re-ordering accross sections
    if (item.dataset.section !== draggedItem.dataset.section) continue;

    var itemOriginal = parseInt(item.dataset.position);
    var itemTweaked = itemOriginal + parseInt(item.dataset.tweakDelta);

    if ((itemOriginal < draggedOriginal) && (draggedTweaked < itemOriginal)) {
      context.moveDown.add(item);
    } else {
      if (draggedTweaked > itemTweaked) {
        context.moveDown.delete(item);
      }
    }

    if ((itemOriginal > draggedOriginal) && (draggedTweaked > itemOriginal)) {
      context.moveUp.add(item);
    } else {
      if (draggedTweaked < itemTweaked) {
        context.moveUp.delete(item);
      }
    }
  }
}

function applyChanges(context, geometry, domItems) {
  debug('apply changes');
  if (!context.item) return Promise.resolve();

  var itemHeight = geometry.itemHeight;
  var draggedItem = context.item;
  var promises = [];

  for (var i = 0; i < domItems.length; i++) {
    var item = domItems[i];
    if (item === draggedItem) continue;

    // Reset
    if (item.dataset.tweakDelta &&
       !context.moveUp.has(item) && !context.moveDown.has(item)) {

      promises.push(tweakAndTransition(item, 0));
    }

    // Moving down
    if (context.moveDown.has(item)) {
      if (parseInt(item.dataset.tweakDelta) !== itemHeight) {
        promises.push(tweakAndTransition(item, itemHeight));
      }
    }

    // Moving up
    if (context.moveUp.has(item)) {
      if (parseInt(item.dataset.tweakDelta) !== itemHeight * -1) {
        promises.push(tweakAndTransition(item, itemHeight * -1));
      }
    }
  }

  return Promise.all(promises);
}

function moveInPlace(context, geometry) {
  debug('move in place');
  var li = context.item;

  // We're already in place
  if (!li.dataset.tweakDelta) return Promise.resolve();

  var position = parseInt(li.dataset.position);
  var taintedPosition = position + parseInt(li.dataset.tweakDelta);
  var itemHeight = geometry.itemHeight;
  var newPosition = position + context.moveUp.size * itemHeight -
    context.moveDown.size * itemHeight;

  var duration = (Math.abs(taintedPosition - newPosition) / itemHeight) * 150;

  return schedule.feedback(function() {
    li.style.transition = 'transform ' + duration + 'ms linear';
    li.style.webkitTransition = '-webkit-transform ' + duration + 'ms linear';
    setTimeout(tweakTransform.bind(null, li, (newPosition - position)));
  }, li, 'transitionend');
}

// Shorthand
function on(el, name, fn) { el.addEventListener(name, fn); }
function off(el, name, fn) { el.removeEventListener(name, fn); }

});})((typeof define)[0]=='f'&&define.amd?define:(function(n,n2,w){'use strict';
return(typeof module)[0]=='o'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}};c(function(n){w[n];},m.exports,m);
w[n]=w[n2]=m.exports;};})('fastListEdit','fast-list-edit',this));
