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

  var _handleEvent = function(event) {
    // Ignore the change event when the list view is not enabled.
    if (!_enabled) {
      return;
    }

    var data = event.data;
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
      default:
        break;
    }
  };

  var _insert = function(index, items) {
    if (items.length <= 0)
      return;

    // add DOM elements
    var referenceElement =
      _root.querySelector('li:nth-child(' + (index + 1) + ')');
    for (var i = items.length - 1; i >= 0; i--) {
      var curElement = _templateFunc(items[i]);
      _root.insertBefore(curElement, referenceElement);
      referenceElement = curElement;
    }
  };

  var _remove = function(index, count) {
    if (count === 0)
      return;

    // remove DOM elements
    if (count === _root.childElementCount) {
      // clear all
      while (_root.firstElementChild) {
        _root.removeChild(_root.firstElementChild);
      }
    } else {
      var nextElement =
        _root.querySelector('li:nth-child(' + (index + 1) + ')');
      for (var i = 0; i < count; i++) {
        if (nextElement) {
          var temp = nextElement.nextElementSibling;
          _root.removeChild(nextElement);
          nextElement = temp;
        } else {
          break;
        }
      }
    }
  };

  var _replace = function(index, value) {
    var element = _root.querySelector('li:nth-child(' + (index + 1) + ')');
    if (element) {
      _templateFunc(value, element);
    }
  };

  var _reset = function(items) {
    var itemCount = items.length;
    var elementCount = _root.childElementCount;

    if (itemCount == 0) {
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
      // clear all existing items
      if (_observableArray) {
        _remove(0, _observableArray.length);
      }

      if (!newArray) {
        _observableArray = null;
        return;
      }

      // If new array is an ordinary array, convert it to an ObservableArray.
      if (Array.isArray(newArray)) {
        newArray = ObservableArray(newArray);
      }
      _observableArray = newArray;

      // An ObservableArray fires the four events for notifying its changes.
      // Register to these events for updating UI.
      _observableArray.observe('insert', _handleEvent);
      _observableArray.observe('remove', _handleEvent);
      _observableArray.observe('replace', _handleEvent);
      _observableArray.observe('reset', _handleEvent);

      _insert(0, _observableArray.array);
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

  view.set(observableArray);
  return view;
};
