'use strict';

define(function(require) {
  var elements = new WeakMap();
  var ObservableArray = require('modules/mvvm/observable_array');

  /*
   * A ListView takes an ObservableArray or an ordinary array, and generate/
   * manipulate the corresponding DOM elements of the content in the array using
   * the given template function. If the array is an ObservableArray, ListView
   * updates the DOM elements accordingly when the array is manipulated.
   */
  var ListView = function(root, observableArray, templateFunc) {
    var _observableArray = null;
    var _root = root;
    var _templateFunc = templateFunc;
    var _enabled = true;

    // keep track of observeables so we can unobserve
    var observerMap = new WeakMap();

    function releaseObservers(element) {
      var observable = observerMap.get(element);
      if (!observable || typeof observable !== 'object') {
        return;
      }
      var observers = observerMap.get(observable);
      if (observers) {
        observers.forEach(function eachObserver(observer) {
          observable.unobserve(observer);
        });
        observerMap.delete(observable);
        observerMap.delete(element);
      }
    }

    // helper to observe something and automatically remove old observers
    function observeAndCall(observable, map) {
      var observers = observerMap.get(observable) || [];
      if (observerMap.has(observable)) {
        observers = observerMap.get(observable);
      }
      observers = Object.keys(map).map(function eachProperty(property) {
        observable.observe(property, map[property]);
        map[property]();
        return map[property];
      });
      observerMap.set(observable, observers);
    }

    var _helper = {
      observeAndCall: observeAndCall
    };

    var _handleEvent = function(event) {
      // Ignore the change event when the list view is not enabled.
      if (!_enabled) {
        return;
      }

      var data = event.detail;
      switch (event.type) {
        case 'insert':
          _insert(data.index, data.items);
          break;
        case 'remove':
          _remove(data.index, data.count);
          break;
        case 'replace':
          _replace(data.index, data.newValue);
          break;
        case 'reset':
          _reset(data.items || []);
          break;
        default:
          break;
      }
    };

    var _insert = function(index, items) {
      if (items.length <= 0) {
        return;
      }

      // add DOM elements
      var referenceElement = _root.children[index];
      for (var i = items.length - 1; i >= 0; i--) {
        var curElement = _templateFunc(items[i], undefined, _helper);
        observerMap.set(curElement, items[i]);
        _root.insertBefore(curElement, referenceElement);
        referenceElement = curElement;
      }
    };

    var _remove = function(index, count) {
      if (count === 0) {
        return;
      }

      // remove DOM elements
      if (count >= _root.childElementCount) {
        // clear all
        while (_root.firstElementChild) {
          releaseObservers(_root.firstElementChild);
          _root.removeChild(_root.firstElementChild);
        }
      } else {
        var nextElement = _root.children[index];
        for (var i = 0; i < count; i++) {
          if (nextElement) {
            var temp = nextElement.nextElementSibling;
            releaseObservers(nextElement);
            _root.removeChild(nextElement);
            nextElement = temp;
          } else {
            break;
          }
        }
      }
    };

    var _replace = function(index, value) {
      var element = _root.children[index];
      if (element) {
        releaseObservers(element);
        var newElement = _templateFunc(value, element, _helper);
        observerMap.set(element, value);
        if (newElement !== element) {
          _root.insertBefore(newElement, element);
          _root.removeChild(element);
        }
      }
    };

    var _reset = function(items) {
      var itemCount = items.length;
      var elementCount = _root.childElementCount;

      if (itemCount === 0) {
        _remove(0, elementCount);
      } else if (itemCount <= elementCount) {
        items.forEach(function(item, index) {
          _replace(index, item);
        });
        // remove extra elements
        _remove(itemCount, elementCount - itemCount);
      } else {
        var slicedItems = items.slice(0, elementCount);
        var remainingItems = items.slice(elementCount);

        slicedItems.forEach(function(item, index) {
          _replace(index, item);
        });
        // add extra elements
        _insert(elementCount, remainingItems);
      }
    };

    var _enabledChanged = function() {
      if (_enabled) {
        _reset(_observableArray.array);
      }
    };

    var view = {
      set: function lv_set(newArray) {
        if (_observableArray) {
          _observableArray.removeEventListener('insert', _handleEvent);
          _observableArray.removeEventListener('remove', _handleEvent);
          _observableArray.removeEventListener('replace', _handleEvent);
          _observableArray.removeEventListener('reset', _handleEvent);
        }

        if (!newArray) {
          // clear all existing items
          if (_observableArray) {
            _remove(0, _observableArray.length);
            _observableArray = null;
          }
          return;
        }

        // If new array is an ordinary array, convert it to an ObservableArray.
        if (Array.isArray(newArray)) {
          newArray = ObservableArray(newArray);
        }
        _observableArray = newArray;

        // An ObservableArray fires the four events for notifying its changes.
        // Register to these events for updating UI.
        _observableArray.addEventListener('insert', _handleEvent);
        _observableArray.addEventListener('remove', _handleEvent);
        _observableArray.addEventListener('replace', _handleEvent);
        _observableArray.addEventListener('reset', _handleEvent);

        if (this.enabled) {
          _reset(_observableArray.array);
        }
      },

      destroy: function() {
        // unobserve from array and null everything out
        if (_observableArray) {
          _observableArray.removeEventListener('insert', _handleEvent);
          _observableArray.removeEventListener('remove', _handleEvent);
          _observableArray.removeEventListener('replace', _handleEvent);
          _observableArray.removeEventListener('reset', _handleEvent);
        }
        _remove(0, _observableArray.length);
        elements.delete(_root);
        _root = null;
        _observableArray = null;
        _templateFunc = null;
        _enabled = false;
      },

      get element() {
        return _root;
      },

      set enabled(value) {
        if (_enabled !== value) {
          _enabled = value;
          _enabledChanged();
        }
      },

      get enabled() {
        return _enabled;
      }
    };

    if (elements.has(_root)) {
      // destroy old ListView if we setup a second one
      elements.get(_root).destroy();
    }

    elements.set(_root, view);

    // emtpy element at creation time
    _root.innerHTML = '';

    view.set(observableArray);
    return view;
  };

  return ListView;
});
