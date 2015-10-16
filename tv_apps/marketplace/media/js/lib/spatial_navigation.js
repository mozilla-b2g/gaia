/*
 * A javascript-based implementation of Spatial Navigation.
 *
 * Copyright (c) 2015 Luke Chang.
 * https://github.com/luke-chang/jquery-spatialNavigation
 *
 * Licensed under the MPL license.
 */
;(function($) {
  'use strict';

  /************************/
  /* Global Configuration */
  /************************/
  // Note: an <extSelector> can be one of following types:
  // - a valid selector string for "querySelector" or jQuery (if it exists)
  // - a standard DOM element
  // - a jQuery object
  // - a string "@<sectionId>" to indicate the specified section
  // - a string "@" to indicate the default section
  var GlobalConfig = {
    selector: '',           // can be a valid selector string, a set of DOM
                            // elements or an jQuery object.
    straightOnly: false,
    straightOverlapThreshold: 0.5,
    rememberSource: false,
    defaultElement: '',     // <extSelector>
    enterTo: '',            // '', 'last-focused', 'default-element'
    leaveFor: null,         // {left: <extSelector>, right: <extSelector>,
                            //  up: <extSelector>, down: <extSelector>}
    restrict: 'self-first', // 'self-first', 'self-only', 'none'
    tabIndexIgnoreList:
      'a, input, select, textarea, button, iframe, [contentEditable=true]',
    navigableFilter: null
  };

  /*********************/
  /* Constant Variable */
  /*********************/
  var KEYMAPPING = {
    '37': 'left',
    '38': 'up',
    '39': 'right',
    '40': 'down'
  };

  var REVERSE = {
    'left': 'right',
    'up': 'down',
    'right': 'left',
    'down': 'up'
  };

  var EVENT_PREFIX = 'sn:';
  var ID_POOL_PREFIX = 'section-';

  /********************/
  /* Private Variable */
  /********************/
  var _idPool = 0;
  var _ready = false;
  var _pause = false;
  var _sections = {};
  var _sectionCount = 0;
  var _defaultSectionId = '';
  var _lastSectionId = '';
  var _duringFocusChange = false;

  /*****************/
  /* Core Function */
  /*****************/
  function getRect(elem) {
    var cr = elem.getBoundingClientRect();
    var rect = {
        left: cr.left,
        top: cr.top,
        width: cr.width,
        height: cr.height
    };
    rect.element = elem;
    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;
    rect.center = {
      x: rect.left + Math.floor(rect.width / 2),
      y: rect.top + Math.floor(rect.height / 2)
    };
    rect.center.left = rect.center.right = rect.center.x;
    rect.center.top = rect.center.bottom = rect.center.y;
    return rect;
  }

  function partition(rects, targetRect, straightOverlapThreshold) {
    var groups = [[], [], [], [], [], [], [], [], []];

    for (var i = 0; i < rects.length; i++) {
      var rect = rects[i];
      var center = rect.center;
      var x, y, groupId;

      if (center.x < targetRect.left) {
        x = 0;
      } else if (center.x <= targetRect.right) {
        x = 1;
      } else {
        x = 2;
      }

      if (center.y < targetRect.top) {
        y = 0;
      } else if (center.y <= targetRect.bottom) {
        y = 1;
      } else {
        y = 2;
      }

      groupId = y * 3 + x;
      groups[groupId].push(rect);

      if ([0, 2, 6, 8].indexOf(groupId) !== -1) {
        var threshold = straightOverlapThreshold;

        if (rect.left <= targetRect.right - targetRect.width * threshold) {
          if (groupId === 2) {
            groups[1].push(rect);
          } else if (groupId === 8) {
            groups[7].push(rect);
          }
        }

        if (rect.right >= targetRect.left + targetRect.width * threshold) {
          if (groupId === 0) {
            groups[1].push(rect);
          } else if (groupId === 6) {
            groups[7].push(rect);
          }
        }

        if (rect.top <= targetRect.bottom - targetRect.height * threshold) {
          if (groupId === 6) {
            groups[3].push(rect);
          } else if (groupId === 8) {
            groups[5].push(rect);
          }
        }

        if (rect.bottom >= targetRect.top + targetRect.height * threshold) {
          if (groupId === 0) {
            groups[3].push(rect);
          } else if (groupId === 2) {
            groups[5].push(rect);
          }
        }
      }
    }

    return groups;
  }

  function generateDistanceFunction(targetRect) {
    return {
      nearPlumbLineIsBetter: function(rect) {
        var d;
        if (rect.center.x < targetRect.center.x) {
          d = targetRect.center.x - rect.right;
        } else {
          d = rect.left - targetRect.center.x;
        }
        return d < 0 ? 0 : d;
      },
      nearHorizonIsBetter: function(rect) {
        var d;
        if (rect.center.y < targetRect.center.y) {
          d = targetRect.center.y - rect.bottom;
        } else {
          d = rect.top - targetRect.center.y;
        }
        return d < 0 ? 0 : d;
      },
      nearTargetLeftIsBetter: function(rect) {
        var d;
        if (rect.center.x < targetRect.center.x) {
          d = targetRect.left - rect.right;
        } else {
          d = rect.left - targetRect.left;
        }
        return d < 0 ? 0 : d;
      },
      nearTargetTopIsBetter: function(rect) {
        var d;
        if (rect.center.y < targetRect.center.y) {
          d = targetRect.top - rect.bottom;
        } else {
          d = rect.top - targetRect.top;
        }
        return d < 0 ? 0 : d;
      },
      topIsBetter: function(rect) {
        return rect.top;
      },
      bottomIsBetter: function(rect) {
        return -1 * rect.bottom;
      },
      leftIsBetter: function(rect) {
        return rect.left;
      },
      rightIsBetter: function(rect) {
        return -1 * rect.right;
      }
    };
  }

  function prioritize(priorities) {
    var destPriority = null;
    for (var i = 0; i < priorities.length; i++) {
      if (priorities[i].group.length) {
        destPriority = priorities[i];
        break;
      }
    }

    if (!destPriority) {
      return null;
    }

    var destDistance = destPriority.distance;

    destPriority.group.sort(function(a, b) {
      for (var i = 0; i < destDistance.length; i++) {
        var distance = destDistance[i];
        var delta = distance(a) - distance(b);
        if (delta) {
          return delta;
        }
      }
      return 0;
    });

    return destPriority.group;
  }

  function navigate(target, direction, candidates, config) {
    if (!target || !direction || !candidates || !candidates.length) {
      return null;
    }

    var rects = [];
    for (var i = 0; i < candidates.length; i++) {
      var rect = getRect(candidates[i]);
      if (rect) {
        rects.push(rect);
      }
    }
    if (!rects.length) {
      return null;
    }

    var targetRect = getRect(target);
    if (!targetRect) {
      return null;
    }

    var distanceFunction = generateDistanceFunction(targetRect);

    var groups = partition(
      rects,
      targetRect,
      config.straightOverlapThreshold
    );

    var internalGroups = partition(
      groups[4],
      targetRect.center,
      config.straightOverlapThreshold
    );

    var priorities;

    switch (direction) {
      case 'left':
        priorities = [
          {
            group: internalGroups[0].concat(internalGroups[3])
                                     .concat(internalGroups[6]),
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.topIsBetter
            ]
          },
          {
            group: groups[3],
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.topIsBetter
            ]
          },
          {
            group: groups[0].concat(groups[6]),
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.rightIsBetter,
              distanceFunction.nearTargetTopIsBetter
            ]
          }
        ];
        break;
      case 'right':
        priorities = [
          {
            group: internalGroups[2].concat(internalGroups[5])
                                     .concat(internalGroups[8]),
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.topIsBetter
            ]
          },
          {
            group: groups[5],
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.topIsBetter
            ]
          },
          {
            group: groups[2].concat(groups[8]),
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.leftIsBetter,
              distanceFunction.nearTargetTopIsBetter
            ]
          }
        ];
        break;
      case 'up':
        priorities = [
          {
            group: internalGroups[0].concat(internalGroups[1])
                                     .concat(internalGroups[2]),
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.leftIsBetter
            ]
          },
          {
            group: groups[1],
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.leftIsBetter
            ]
          },
          {
            group: groups[0].concat(groups[2]),
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.bottomIsBetter,
              distanceFunction.nearTargetLeftIsBetter
            ]
          }
        ];
        break;
      case 'down':
        priorities = [
          {
            group: internalGroups[6].concat(internalGroups[7])
                                     .concat(internalGroups[8]),
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.leftIsBetter
            ]
          },
          {
            group: groups[7],
            distance: [
              distanceFunction.nearHorizonIsBetter,
              distanceFunction.leftIsBetter
            ]
          },
          {
            group: groups[6].concat(groups[8]),
            distance: [
              distanceFunction.nearPlumbLineIsBetter,
              distanceFunction.topIsBetter,
              distanceFunction.nearTargetLeftIsBetter
            ]
          }
        ];
        break;
      default:
        return null;
    }

    if (config.straightOnly) {
      priorities.pop();
    }

    var destGroup = prioritize(priorities);
    if (!destGroup) {
      return null;
    }

    var dest = null;
    if (config.rememberSource &&
        config.previous &&
        config.previous.destination === target &&
        config.previous.reverse === direction) {
      for (var j = 0; j < destGroup.length; j++) {
        if (destGroup[j].element === config.previous.target) {
          dest = destGroup[j].element;
          break;
        }
      }
    }

    if (!dest) dest = destGroup[0].element;

    return dest;
  }

  /********************/
  /* Private Function */
  /********************/
  function generateId() {
    var id;
    while(true) {
      id = ID_POOL_PREFIX + String(++_idPool);
      if (!_sections[id]) {
        break;
      }
    }
    return id;
  }

  function parseSelector(selector) {
    var result = [];
    if ($) {
      result = $(selector).get();
    } else if (typeof selector === 'string') {
      result = [].slice.call(document.querySelectorAll(selector));
    } else if (typeof selector === 'object' && selector.length) {
      result = [].slice.call(selector);
    }
    return result;
  }

  function getCurrentFocusedElement() {
    var activeElement = document.activeElement;
    if (activeElement != document && activeElement !== document.body) {
      return activeElement;
    }
  }

  function extend(out) {
    out = out || {};
    for (var i = 1; i < arguments.length; i++) {
      if (!arguments[i]) {
        continue;
      }
      for (var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key) &&
            arguments[i][key] !== undefined) {
          out[key] = arguments[i][key];
        }
      }
    }
    return out;
  }

  function exclude(elemList, excludedElem) {
    if (!Array.isArray(excludedElem)) {
      excludedElem = [excludedElem];
    }
    for (var i = 0, index; i < excludedElem.length; i++) {
      index = elemList.indexOf(excludedElem[i]);
      if (index >= 0) {
        elemList.splice(index, 1);
      }
    }
    return elemList;
  }

  function isNavigable(elem, sectionId) {
    if (! elem) {
      return false;
    }
    if ((elem.offsetWidth <= 0 && elem.offsetHeight <= 0) || elem.disabled) {
      return false;
    }
    if (sectionId &&
        typeof _sections[sectionId].navigableFilter === 'function') {
      if (_sections[sectionId].navigableFilter(elem, sectionId) === false) {
        return false;
      }
    } else if (typeof GlobalConfig.navigableFilter === 'function' &&
               GlobalConfig.navigableFilter(elem, sectionId) === false) {
      return false;
    }
    return true;
  }

  function getSectionId(elem) {
    for (var id in _sections) {
      var sectionElements = parseSelector(_sections[id].selector);
      if (sectionElements.indexOf(elem) >= 0) {
        return id;
      }
    }
  }

  function getSectionNavigableElements(sectionId) {
    return parseSelector(_sections[sectionId].selector).filter(function(elem) {
      return isNavigable(elem, sectionId);
    });
  }

  function fireEvent(elem, type, details) {
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent(EVENT_PREFIX + type, true, true, details);
    return elem.dispatchEvent(evt);
  }

  function focusElement(elem, sectionId) {
    if (!elem) {
      return false;
    }

    var currentFocusedElement = getCurrentFocusedElement();

    var silentFocus = function() {
      if (currentFocusedElement) {
        currentFocusedElement.blur();
      }
      elem.focus();
      focusChanged(elem, sectionId);
    };

    if (_duringFocusChange) {
      silentFocus();
      return true;
    }

    _duringFocusChange = true;

    if (_pause) {
      silentFocus();
      _duringFocusChange = false;
      return true;
    }

    if (currentFocusedElement) {
      var unfocusProperties = {
        next: elem,
        nextSection: sectionId
      };
      if (!fireEvent(currentFocusedElement, 'willunfocus', unfocusProperties)) {
        _duringFocusChange = false;
        return false;
      }
      currentFocusedElement.blur();
      fireEvent(currentFocusedElement, 'unfocused', unfocusProperties);
    }

    var focusProperties = {
      from: currentFocusedElement,
      section: sectionId
    };
    if (!fireEvent(elem, 'willfocus', focusProperties)) {
      _duringFocusChange = false;
      return false;
    }
    elem.focus();
    fireEvent(elem, 'focused', focusProperties);

    _duringFocusChange = false;

    focusChanged(elem, sectionId);
    return true;
  }

  function focusChanged(elem, sectionId) {
    if (!sectionId) {
      sectionId = getSectionId(elem);
    }
    if (sectionId) {
      _sections[sectionId].lastFocusedElement = elem;
      _lastSectionId = sectionId;
    }
  }

  function focusExtendedSelector(selector) {
    if (selector.charAt(0) == '@') {
      if (selector.length == 1) {
        return focusSection();
      } else {
        var sectionId = selector.substr(1);
        return focusSection(sectionId);
      }
    } else {
      var next = parseSelector(selector)[0];
      if (next) {
        var nextSectionId = getSectionId(next);
        if (isNavigable(next, nextSectionId)) {
          return focusElement(next, nextSectionId);
        }
      }
    }
    return false;
  }

  function focusSection(sectionId) {
    var next, nextSectionId;
    var elemOrder = ['defaultElement', 'lastFocusedElement'];

    var range = [];
    var addRange = function(id) {
      if (id && range.indexOf(id) < 0 && _sections[id]) {
        range.push(id);
      }
    };

    if (sectionId) {
      if (_sections[sectionId]) {
        addRange(sectionId);
      }
    } else {
      addRange(_defaultSectionId);
      addRange(_lastSectionId);
      addRange(Object.keys(_sections)[0]);
    }

    for (var i = 0; i < range.length && !next; i++) {
      var id = range[i];

      for (var j = 0; j < elemOrder.length && !next; j++) {
        var elem = _sections[id][elemOrder[j]];

        if ($ && elem instanceof $) {
          elem = elem.get(0);
        } else if (typeof elem === 'string') {
          if (focusExtendedSelector(elem)) {
            return true;
          } else {
            continue;
          }
        }

        if (elem && isNavigable(elem, id)) {
          next = elem;
          nextSectionId = id;
        }
      }

      if (!next) {
        var navigableElements = getSectionNavigableElements(id);
        if (navigableElements.length) {
          next = navigableElements[0];
          nextSectionId = id;
        }
      }
    }

    if (!next) {
      return false;
    }

    return focusElement(next, nextSectionId);
  }

  function fireNavigatefailed(elem, direction) {
    fireEvent(elem, 'navigatefailed', {
      direction: direction
    });
  }

  function gotoLeaveFor(sectionId, direction) {
    if (_sections[sectionId].leaveFor &&
        _sections[sectionId].leaveFor[direction] !== undefined) {
      var next = _sections[sectionId].leaveFor[direction];

      if (typeof next === 'string') {
        if (next === '') {
          return null;
        }
        return focusExtendedSelector(next);
      }

      if ($ && next instanceof $) {
        next = next.get(0);
      }

      var nextSectionId = getSectionId(next);
      if (isNavigable(next, nextSectionId)) {
        return focusElement(next, nextSectionId);
      }
    }
    return false;
  }

  function onKeyDown(evt) {
    var preventDefault = function() {
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    };

    var next, nextSectionId, currentFocusedElement;

    if (!_sectionCount || _pause) {
      return;
    }

    var direction = KEYMAPPING[evt.keyCode];
    if (!direction) {
      if (evt.keyCode == 13) {
        currentFocusedElement = getCurrentFocusedElement();
        if (currentFocusedElement && getSectionId(currentFocusedElement)) {
          if (!fireEvent(currentFocusedElement, 'enter-down')) {
            return preventDefault();
          }
        }
      }
      return;
    }

    currentFocusedElement = getCurrentFocusedElement();

    if (!currentFocusedElement) {
      if (_lastSectionId && _sections[_lastSectionId] && isNavigable(
                _sections[_lastSectionId].lastFocusedElement, _lastSectionId)) {
        currentFocusedElement = _sections[_lastSectionId].lastFocusedElement;
      } else {
        focusSection();
        return preventDefault();
      }
    }

    var currentSectionId = getSectionId(currentFocusedElement);
    if (!currentSectionId) {
      focusSection();
      return preventDefault();
    }

    var extSelector =
      currentFocusedElement.getAttribute('data-sn-' + direction);
    if (typeof extSelector === 'string') {
      if (extSelector === '' ||
          !focusExtendedSelector(extSelector)) {
        fireNavigatefailed(currentFocusedElement, direction);
      }
      return preventDefault();
    }

    var sectionNavigableElements = {};
    var allNavigableElements = [];
    for (var id in _sections) {
      sectionNavigableElements[id] = getSectionNavigableElements(id);
      allNavigableElements =
        allNavigableElements.concat(sectionNavigableElements[id]);
    }

    var config = extend({}, GlobalConfig, _sections[currentSectionId]);

    if (config.restrict == 'self-only' || config.restrict == 'self-first') {
      var currentSectionNavigableElements =
        sectionNavigableElements[currentSectionId];

      next = navigate(
        currentFocusedElement,
        direction,
        exclude(currentSectionNavigableElements, currentFocusedElement),
        config
      );

      if (!next && config.restrict == 'self-first') {
        next = navigate(
          currentFocusedElement,
          direction,
          exclude(allNavigableElements, currentSectionNavigableElements),
          config
        );
      }
    } else {
      next = navigate(
        currentFocusedElement,
        direction,
        exclude(allNavigableElements, currentFocusedElement),
        config
      );
    }

    if (next) {
      _sections[currentSectionId].previous = {
        target: currentFocusedElement,
        destination: next,
        reverse: REVERSE[direction]
      };

      nextSectionId = getSectionId(next);

      if (currentSectionId != nextSectionId) {
        var result = gotoLeaveFor(currentSectionId, direction);
        if (result) {
          return preventDefault();
        } else if (result === null) {
          fireNavigatefailed(currentFocusedElement, direction);
          return preventDefault();
        }

        var nextSection = _sections[nextSectionId];
        if (nextSection.enterTo == 'last-focused' &&
            nextSection.lastFocusedElement &&
            isNavigable(nextSection.lastFocusedElement, nextSectionId)) {
          next = nextSection.lastFocusedElement;
        } else if (nextSection.enterTo == 'default-element' &&
                   nextSection.defaultElement) {
          var defaultElement = nextSection.defaultElement;
          if (typeof defaultElement === 'string') {
            defaultElement = parseSelector(defaultElement)[0];
          } else if ($ && defaultElement instanceof $) {
            defaultElement = defaultElement.get(0);
          }
          if (isNavigable(defaultElement, nextSectionId)) {
            next = defaultElement;
          }
        }
      }

      focusElement(next, nextSectionId);
    } else if (!gotoLeaveFor(currentSectionId, direction)) {
      fireNavigatefailed(currentFocusedElement, direction);
    }

    return preventDefault();
  }

  function onKeyUp(evt) {
    if (!_pause && _sectionCount && evt.keyCode == 13) {
      var currentFocusedElement = getCurrentFocusedElement();
      if (currentFocusedElement && getSectionId(currentFocusedElement)) {
        if (!fireEvent(currentFocusedElement, 'enter-up')) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      }
    }
  }

  function onFocus(evt) {
    if (evt.target !== window && evt.target !== document &&
        _sectionCount && !_duringFocusChange) {
      focusChanged(evt.target);
    }
  }

  /*******************/
  /* Public Function */
  /*******************/
  var SpatialNavigation = {
    init: function() {
      if (!_ready) {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('focus', onFocus, true);
        _ready = true;
      }
    },

    uninit: function() {
      window.removeEventListener('focus', onFocus, true);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onKeyDown);
      SpatialNavigation.clear();
      _idPool = 0;
      _ready = false;
    },

    clear: function() {
      _sections = {};
      _sectionCount = 0;
      _defaultSectionId = '';
      _lastSectionId = '';
      _duringFocusChange = false;
    },

    // set(<config>);
    // set(<sectionId>, <config>);
    set: function() {
      var sectionId, config;

      if (typeof arguments[0] === 'object') {
        config = arguments[0];
      } else if (typeof arguments[0] === 'string' &&
                 typeof arguments[1] === 'object') {
        sectionId = arguments[0];
        config = arguments[1];
        if (!_sections[sectionId]) {
          throw new Error('Section "' + sectionId + '" doesn\'t exist!');
        }
      } else {
        return;
      }

      for (var key in config) {
        if (GlobalConfig[key] !== undefined) {
          if (sectionId) {
            _sections[sectionId][key] = config[key];
          } else if (config[key] !== undefined) {
            GlobalConfig[key] = config[key];
          }
        }
      }

      if (sectionId) {
        // remove "undefined" items
        _sections[sectionId] = extend({}, _sections[sectionId]);
      }
    },

    // add(<config>);
    // add(<sectionId>, <config>);
    add: function() {
      var sectionId;
      var config = {};

      if (typeof arguments[0] === 'object') {
        config = arguments[0];
      } else if (typeof arguments[0] === 'string' &&
                 typeof arguments[1] === 'object') {
        sectionId = arguments[0];
        config = arguments[1];
      }

      if (!sectionId) {
        sectionId = (typeof config.id === 'string') ? config.id : generateId();
      }

      if (_sections[sectionId]) {
        throw new Error('Section "' + sectionId + '" has already existed!');
      }

      _sections[sectionId] = {};
      _sectionCount++;

      SpatialNavigation.set(sectionId, config);

      return sectionId;
    },

    remove: function(sectionId) {
      if (!sectionId || typeof sectionId !== 'string') {
        throw new Error('Please assign the "sectionId"!');
      }
      if (_sections[sectionId]) {
        _sections[sectionId] = undefined;
        _sections = extend({}, _sections);
        _sectionCount--;
        return true;
      }
      return false;
    },

    pause: function() {
      _pause = true;
    },

    resume: function() {
      _pause = false;
    },

    // focus()
    // focus(<sectionId>)
    // focus(<extSelector>)
    // Note: "silent" is optional and default to false
    focus: function(elem, silent) {
      var result = false;

      if (silent === undefined && typeof elem === 'boolean') {
        silent = elem;
        elem = undefined;
      }

      var autoPause = !_pause && silent;

      if (autoPause) {
        SpatialNavigation.pause();
      }

      if (!elem) {
        result  = focusSection();
      } else {
        if (typeof elem === 'string') {
          if (_sections[elem]) {
            result = focusSection(elem);
          } else {
            result = focusExtendedSelector(elem);
          }
        } else {
          if ($ && elem instanceof $) {
            elem = elem.get(0);
          }

          var nextSectionId = getSectionId(elem);
          if (isNavigable(elem, nextSectionId)) {
            result = focusElement(elem, nextSectionId);
          }
        }
      }

      if (autoPause) {
        SpatialNavigation.resume();
      }

      return result;
    },

    // makeFocusable()
    // makeFocusable(<sectionId>)
    makeFocusable: function(sectionId) {
      var elementPrototype = Element.prototype;
      var elementMatchesSelector =
        elementPrototype.matches ||
        elementPrototype.matchesSelector ||
        elementPrototype.mozMatchesSelector ||
        elementPrototype.webkitMatchesSelector ||
        elementPrototype.msMatchesSelector ||
        elementPrototype.oMatchesSelector ||
        function (selector) {
          var matchedNodes =
            (this.parentNode || this.document).querySelectorAll(selector);
          var i = matchedNodes.length;
          while (--i >= 0 && matchedNodes[i] !== this);
          return i > -1;
        };

      var doMakeFocusable = function(section) {
        var tabIndexIgnoreList = section.tabIndexIgnoreList !== undefined ?
          section.tabIndexIgnoreList : GlobalConfig.tabIndexIgnoreList;
        var candidates = parseSelector(section.selector);
        candidates.forEach(function(elem) {
          if (!elementMatchesSelector.call(elem, tabIndexIgnoreList)) {
            if (!elem.getAttribute('tabindex')) {
              elem.setAttribute('tabindex', '-1');
            }
          }
        });
      };

      if (sectionId) {
        if (_sections[sectionId]) {
          doMakeFocusable(_sections[sectionId]);
        } else {
          throw new Error('Section "' + sectionId + '" doesn\'t exist!');
        }
      } else {
        for (var id in _sections) {
          doMakeFocusable(_sections[id]);
        }
      }
    },

    setDefaultSection: function(sectionId) {
      if (!sectionId) {
        _defaultSectionId = '';
      } else if (!_sections[sectionId]) {
        throw new Error('Section "' + sectionId + '" doesn\'t exist!');
      } else {
        _defaultSectionId = sectionId;
      }
    }
  };

  window.SpatialNavigation = SpatialNavigation;

  /********************/
  /* jQuery Interface */
  /********************/
  if ($) {
    $.SpatialNavigation = function() {
      SpatialNavigation.init();

      if (arguments.length > 0) {
        if ($.isPlainObject(arguments[0])) {
          return SpatialNavigation.add(arguments[0]);
        } else if ($.type(arguments[0]) === 'string' &&
                   $.isFunction(SpatialNavigation[arguments[0]])) {
          return SpatialNavigation[arguments[0]]
            .apply(SpatialNavigation, [].slice.call(arguments, 1));
        }
      }

      return $.extend({}, SpatialNavigation);
    };

    $.fn.SpatialNavigation = function() {
      var config;

      if ($.isPlainObject(arguments[0])) {
        config = arguments[0];
      } else {
        config = {
          id: arguments[0]
        };
      }

      config.selector = this;

      SpatialNavigation.init();
      if (config.id) {
        SpatialNavigation.remove(config.id);
      }
      SpatialNavigation.add(config);
      SpatialNavigation.makeFocusable(config.id);

      return this;
    };
  }
})(window.jQuery);
