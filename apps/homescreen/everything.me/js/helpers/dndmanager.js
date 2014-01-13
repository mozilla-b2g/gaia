'use strict';

/**
 * Manager for organizing items ordered in a (rows, ICONS_PER_ROW) dimensional
 * grid.
 *
 * Assuming 'o' (originNode) was dragged and dropped over 't' (targetNode) :
 * x o z t      x z t o
 * x x x x  ==> x x x x
 * x x x x      x x x x
 *
 */
function Evme_dndManager() {

  // the dragging arena (container)
  // currently hard coded for collections for simplicity
  var dndContainerEl = document.getElementById('collection');

  // initial coordinates
  var sx, sy;

  // coordinates updated with every touch move
  var cx, cy;

  // the element we want to drag
  var originNode;

  // the common parent of the nodes we are organizing
  var parentNode;

  // child nodes of parentNode
  // we store a mutable copy for keeping track of temporary ordering while
  // dragging without actually changing the DOM
  var children;

  // the dragged node will be inserted before this node
  var insertBeforeNode;

  // the 'cloned' element that is visually dragged on screen
  var draggableEl;

  // the element we are dragging over
  // triggeres the re-arrange
  var targetNode;

  // position of targetNode when triggering re-arrange
  var targetIndex;

  // flags that nodes are shifted from original positions
  var shifted = false;

  // callback to execute after rearranging
  var rearrangeCb;

  // currently animating nodes
  var animatingNodes;

  var hoverTimeout = null;

  // constants
  var HOVER_DELAY = Page.prototype.REARRANGE_DELAY;
  var DRAGGING_TRANSITION = Page.prototype.DRAGGING_TRANSITION;
  var ICONS_PER_ROW = Page.prototype.ICONS_PER_ROW;

  // support mouse events for simulator and desktopb2g
  var isTouch = 'ontouchstart' in window;
  var touchmove = isTouch ? 'touchmove' : 'mousemove';
  var touchend = isTouch ? 'touchend' : 'mouseup';

  var getTouch = (function getTouchWrapper() {
    return isTouch ? function(e) { return e.touches[0] } :
                     function(e) { return e };
  })();

  /**
   * touchmove handler
   *
   * - move draggable element
   * - trigger rearrange preview if hovering on sibling longer than HOVER_DELAY
   */
  function onMove(evt) {
    evt.preventDefault();

    cx = getTouch(evt).pageX;
    cy = getTouch(evt).pageY;

    window.mozRequestAnimationFrame(moveDraggable);

    var elFromPoint = document.elementFromPoint(cx, cy);

    // avoid triggering duplicated events -
    // same target at same location, do nothing
    if (elFromPoint === targetNode &&
        children.indexOf(elFromPoint) === targetIndex) {
      return;
    }

    targetNode = elFromPoint;

    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // dragging within parent bounds
    if (targetNode.parentNode === parentNode) {
      // on sibling - re-arrange
      if (targetNode !== originNode) {
        targetIndex = children.indexOf(targetNode);
        hoverTimeout = setTimeout(shiftNodes, HOVER_DELAY);
      }
    }
  }

  // touchend handler
  function onEnd() {
    window.removeEventListener(touchmove, onMove);
    window.removeEventListener(touchend, onEnd);

    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    if (shifted) {
      rearrange();
    } else {
      revert();
    }
  }

  function moveDraggable() {
    draggableEl.style.MozTransform =
      'translate(' + (cx - sx) + 'px,' + (cy - sy) + 'px)';
  }

  // 'preview mode' - move nodes to where they would end up when dropping
  // the dragged icon on targetNode
  function shiftNodes() {
    // animation already in progress - abort
    if (animatingNodes.length) {
      return;
    }

    shifted = true;

    var originIndex = children.indexOf(originNode);
    var targetIndex = children.indexOf(targetNode);

    if (originIndex < 0 || targetIndex < 0) {
      return;
    }

    var forward = originIndex < targetIndex;
    insertBeforeNode = forward ? targetNode.nextSibling : targetNode;

    // translate nodes to new positions
    // originNode is translated ** WITHOUT ** transition
    translateNode(originNode, originIndex, targetIndex);

    if (forward) {
      for (var i = originIndex + 1; i <= targetIndex; i++) {
        translateNode(children[i], i, i - 1, DRAGGING_TRANSITION);
      }
    } else {
      for (var i = targetIndex; i < originIndex; i++) {
        translateNode(children[i], i, i + 1, DRAGGING_TRANSITION);
      }
    }

    function translateNode(node, from, to, transition) {
      if (!node) {
        return;
      }

      var x = node.dataset.posX = parseInt(node.dataset.posX || 0) +
                        ((Math.floor(to % ICONS_PER_ROW) -
                          Math.floor(from % ICONS_PER_ROW)) * 100);
      var y = node.dataset.posY = parseInt(node.dataset.posY || 0) +
                        ((Math.floor(to / ICONS_PER_ROW) -
                          Math.floor(from / ICONS_PER_ROW)) * 100);

      if (transition) {
        animatingNodes.push(node);

        node.addEventListener('transitionend', function tEnd() {
          node.removeEventListener('transitionend', tEnd);
          animatingNodes.splice(animatingNodes.indexOf(node), 1);

          // animations ended, update children ordering to reflect shifting
          if (animatingNodes.length === 0) {
            children.splice(originIndex, 1);
            children.splice(targetIndex, 0, originNode);
          }
        });

        window.mozRequestAnimationFrame(function() {
          node.style.MozTransition = transition;
          node.style.MozTransform = 'translate(' + x + '%, ' + y + '%)';
        });

      } else {
        node.style.MozTransform = 'translate(' + x + '%, ' + y + '%)';
      }
    }
  }

  function clearTranslate() {
    for (var i = 0, node; node = children[i++]; ) {
      node.style.MozTransform = node.style.MozTransition = '';
      delete node.dataset.posX;
      delete node.dataset.posY;
    }

    // restore original order
    children = Array.prototype.slice.call(parentNode.childNodes);
    shifted = false;
  }

  // update DOM with new node ordering
  function rearrange() {
    // animate draggableEl to the new location
    var rect = originNode.getBoundingClientRect();
    var x = rect.left - draggableEl.dataset.initX;
    var y = rect.top - draggableEl.dataset.initY;

    animateDraggable(x, y, function onEnd() {
      // cancel transitions to avoid flickering
      parentNode.dataset.rearranging = true;

      setTimeout(function() {
        // clear translations and update the DOM on the same tick
        clearTranslate();
        parentNode.insertBefore(originNode, insertBeforeNode);
        shrink();
        cleanup();

        setTimeout(function() {
          // next tick
          delete parentNode.dataset.rearranging;

          // call callback with new index of originNode
          var newIndex =
            Array.prototype.indexOf.call(parentNode.childNodes, originNode);

          if (newIndex > -1) {
            rearrangeCb(newIndex);
          }
        });
      });
    });
  }

  // move draggableEl back to original location
  function revert() {
    animateDraggable(0, 0, cleanup);
  }

  // animate draggableEl to x,y then execute callback
  function animateDraggable(x, y, callback) {
    dndContainerEl.dataset.transitioning = true;
    draggableEl.style.MozTransition = '-moz-transform .4s';
    draggableEl.style.MozTransform = 'translate(' + x + 'px,' + y + 'px)';
    shrink();

    draggableEl.addEventListener('transitionend', function tEnd(e) {
      e.target.removeEventListener('transitionend', tEnd);
      delete dndContainerEl.dataset.transitioning;
      callback();
    });
  }

  function shrink() {
    var divContainer = draggableEl.querySelector('div');
    divContainer.style.MozTransform = 'scale(1)';
  }

  function cleanup() {
    delete dndContainerEl.dataset.dragging;
    delete originNode.dataset.dragging;

    if (draggableEl) {
      dndContainerEl.removeChild(draggableEl);
    }
    draggableEl = null;
  }

  // create cloned draggable grid-like element from an E.me li element
  function initDraggable() {
    draggableEl = document.createElement('div');
    draggableEl.className = 'draggable';

    var container = document.createElement('div');
    var img = originNode.querySelector('img').cloneNode();
    var labelWrapper = document.createElement('span');
    var label = document.createElement('span');

    // E.me renders the name using canvas but here we need text
    // we get it from originNode's dataset
    labelWrapper.className = 'labelWrapper';
    label.textContent = originNode.dataset.name;
    labelWrapper.appendChild(label);

    container.appendChild(img);
    container.appendChild(labelWrapper);
    draggableEl.appendChild(container);

    var rect = originNode.getBoundingClientRect();
    draggableEl.dataset.initX = rect.left;
    draggableEl.dataset.initY = rect.top;
    draggableEl.style.left = rect.left + 'px';
    draggableEl.style.top = rect.top + 'px';
  }

  /**
   * Start dragging an E.me static app inside a Collection for re-ordering
   * @param  {DOM element}  node
   * @param  {MouseEvent}   contextMenuEvent 'contextmenu' event
   * @param  {Function}     cb callback to execute after rearrange
   *                           receives the new index of node as parameter
   */
  this.start = function start(node, contextMenuEvent, cb) {
    originNode = node;
    parentNode = originNode.parentNode;
    targetNode = originNode;

    children = Array.prototype.slice.call(parentNode.childNodes);
    animatingNodes = [];

    dndContainerEl.dataset.dragging = true;
    originNode.dataset.dragging = true;

    window.addEventListener(touchmove, onMove);
    window.addEventListener(touchend, onEnd);

    initDraggable();
    dndContainerEl.appendChild(draggableEl);

    // save start position
    sx = contextMenuEvent.pageX;
    sy = contextMenuEvent.pageY;

    // set callback
    rearrangeCb = cb || Evme.Utils.NOOP;
  };

  this.stop = function stop() {
    rearrangeCb = Evme.Utils.NOOP;
    cleanup();
  };
}

Evme.dndManager = new Evme_dndManager();
