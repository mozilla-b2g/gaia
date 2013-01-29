'use strict';

var utils = this.utils || {};

// RESPONSIVE

(function() {
  var defaultFontSize = 62.5;
  var defaultWidth = 320;
  var defaultHeight = 480;

  function scale() {
    var deviceWidth = window.innerWidth;
    var fontSize = defaultFontSize;

    //Check for non base width devices
    if (defaultWidth != deviceWidth) {
      var ratio = (deviceWidth / defaultWidth).toFixed(2);
      fontSize *= ratio;
    }

    document.documentElement.style.fontSize = fontSize.toFixed(2) + '%';
  };

  scale();
  window.addEventListener('resize', scale);
})();

utils.status = (function() {
  var STATUS_TIME = 2000;
  var statusMsg = document.querySelector('#statusMsg');

  var showStatus = function(text) {
    statusMsg.querySelector('p').textContent = text;
    statusMsg.classList.add('visible');
    statusMsg.classList.add('bannerStart');
    statusMsg.addEventListener('transitionend', function tend() {
      statusMsg.removeEventListener('transitionend', tend);
      setTimeout(function hide() {
        statusMsg.classList.remove('visible');
        statusMsg.classList.add('bannerEnd');
      }, STATUS_TIME);
      statusMsg.addEventListener('transitionend', function bannerEnd() {
        statusMsg.removeEventListener('transitionend', bannerEnd);
        statusMsg.classList.remove('bannerStart');
        statusMsg.classList.remove('bannerEnd');
      });
    });
  };
  return {
    show: showStatus
  };
})();

if (!utils.text) {
  (function() {
    var Text = utils.text = {};

    // This should be fixed at a plaftorm level using
    // an utf8 normalized form.
    // Platform bug: https://bugzilla.mozilla.org/show_bug.cgi?id=779068
    // Please remove when this bug is fixed.

    Text.normalize = function normalizeText(value) {
      var map = [
        ['[àáâãäå]', 'a'],
        ['æ', 'ae'],
        ['ç', 'c'],
        ['[èéêë]', 'e'],
        ['[ìíîï]', 'i'],
        ['ñ', 'n'],
        ['[òóôõö]', 'o'],
        ['œ', 'oe'],
        ['[ùúûü]', 'u'],
        ['[ýÿ]', 'y']
      ];

      for (var i = 0; i < map.length; i++) {
        value = value.replace(new RegExp(map[i][0], 'gi'), function(match) {
          if (match.toUpperCase() === match) {
            return map[i][1].toUpperCase();
          } else {
            return map[i][1];
          }
        });
      }

      return value;
    };

    // Taken from /apps/browser/js/browser.js
    Text.escapeHTML = function ut_escapeHTML(str, escapeQuotes) {
      var span = document.createElement('span');
      span.textContent = str;

      if (escapeQuotes)
        return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); //"
      return span.innerHTML;
    }
  })();
}

// SQUARE IMG
if (typeof utils.squareImage === 'undefined') {
  utils.squareImage = function(blob, callback) {
    var img = document.createElement('img');
    var url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = function onBlobLoad() {
      var width = img.width;
      var height = img.height;

      if (width === height) {
        callback(blob);
      } else {
        var canvas = document.createElement('canvas');
        var min = canvas.width = canvas.height = Math.min(width, height);
        var context = canvas.getContext('2d');
        context.drawImage(img, (width - min) / 2, (height - min) / 2, min, min,
                          0, 0, min, min);
        canvas.toBlob(callback);
      }

      URL.revokeObjectURL(url);
    }
  }; // utils.squareImage
} // if

// EVENT LISTENER
if (!utils.listeners) {
  (function(document) {
    var Listeners = utils.listeners = {};

    Listeners.add = function(config) {
      try {
        for (var id in config) {
          var handler = config[id];
          var nodes = document.querySelectorAll(id);
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (Array.isArray(handler)) {
              handler.forEach(function handle(item) {
                if (!item.hasOwnProperty('event') &&
                    !item.hasOwnProperty('handler')) {
                  return;
                }
                node.addEventListener(item.event, item.handler);
              });
            } else {
                node.addEventListener('click', handler);
            }
          } // nodes
        } // Handlers
      }
      catch (e) {
        window.console.error('Error while registering listener for: ', id, e);
      }
    } // Add function

  })(document);
}

// CONFIG

var utilities = window.utilities || {};

if (typeof utilities.config === 'undefined') {
  (function() {
    var config = utilities.config = {};

    config.load = function(resource) {

      var outReq = new LoadRequest();

      window.setTimeout(function do_load() {
        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType('application/json');
        xhr.open('GET', resource, true);

        xhr.onreadystatechange = function() {
          // We will get a 0 status if the app is in app://
          if (xhr.readyState === 4 && (xhr.status === 200 ||
                                       xhr.status === 0)) {

            var response = xhr.responseText;
            var configuration = JSON.parse(response);
            outReq.completed(configuration);
          }
          else if (xhr.readyState === 4) {
             outReq.failed(xhr.status);
          }
        } // onreadystatechange

        xhr.send(null);

      },0);

      return outReq;
    }

    function LoadRequest() {
      this.completed = function(configData) {
        if (typeof this.onload === 'function') {
          this.onload(configData);
        }
      }

      this.failed = function(code) {
        if (typeof this.onerror === 'function') {
          this.onerror(code);
        }
      }
    }
  })();
}

// BINARY SEARCH


/**
 * This function performs a binary search over an already sorted array
 * target is the target item to search for
 * array is the sorted array
 * options is an optional object which may contain
 * the start and end position (from, to)
 * an optional arrayField which indicates the object property that contains the
 * comparable item and transform and compare functions
 *
 * Returns an array with the positions on which the target item was found
 *
 */
utils.binarySearch = function(target, array, options) {
  var arrayField = options.arrayField,
      transformFunction = options.transformFunction,
      compareFunction = options.compareFunction;

  // Obtains the comparable item by transforming if necessary
  function getItem(array, index) {
    var item = array[index];
    if (arrayField) {
      item = item[arrayField];
      if (typeof transformFunction === 'function') {
        item = transformFunction(item);
      }
    }
    return item;
  }

  // Compares the target with an array item
  function compare(target, item) {
    var out;
    if (typeof compareFunction === 'function') {
      out = compareFunction(target, item);
    }
    else {
      if (typeof target === 'string') {
         out = target.localeCompare(item);
      }
      else {
        out = target.toString().localeCompare(item);
      }
    }

    return out;
  }

  var from = options.from;
  if (typeof from === 'undefined') {
    from = 0;
  }
  var to = options.to;
  if (typeof to === 'undefined') {
    to = array.length - 1;
  }

  if (to < from) {
    // Not found
    return [];
  }

  var middleIndex = Math.floor((to - from) / 2);
  var item = getItem(array, from + middleIndex);

  var compareResult = compare(target, item);

  if (compareResult === 0) {
    // Once a result is found let's iterate in both directions to get the rest
    // Just in case there are more than one result
    var results = [from + middleIndex];

    var next = from + middleIndex + 1;
    var finish = false;
    while (next <= (array.length - 1) && !finish) {
      var item = getItem(array, next);

      if (compare(target, item) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next++;
    }

    finish = false;
    next = from + middleIndex - 1;

    while (next >= 0 && !finish) {
      var item = getItem(array, next);

      if (compare(target, item) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next--;
    }
    return results;
  }
  else if (compareResult < 0) {
    return utils.binarySearch(target, array, {
      from: from,
      to: to - middleIndex - 1,
      arrayField: arrayField,
      transformFunction: transformFunction,
      compareFunction: compareFunction
    });
  }
  else {
    return utils.binarySearch(target, array, {
      from: from + middleIndex + 1,
      to: to,
      arrayField: arrayField,
      transformFunction: transformFunction,
      compareFunction: compareFunction
    });
  }
};

