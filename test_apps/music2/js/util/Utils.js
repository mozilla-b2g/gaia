'use strict';

var Utils = {
  name: 'Utils',
  remove: function(node) {
    node.parentNode.removeChild(node);
  },
  size: function(obj) {
    var i = 0;
    for (var prop in obj) {
      i++;
    }
    return i;
  },
  runEventOnce: function(elem, eventName, fn) {
    var onceFn = function(event) {
      fn(event);
      elem.removeEventListener(eventName, onceFn);
    };
    elem.addEventListener(eventName, onceFn);
  },
  putOnEventQueue: function(fn) {
    setTimeout(fn, 0);
  },
  loadDomIds: function(view, ids) {
    view.dom = {};
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var idName = id.replace(/-\w/g, function(str) {
        return str[1].toUpperCase();
      });
      view.dom[idName] = document.getElementById(id);
    }
  },
  copyArray: function(array) {
    return array.slice(0);
  },
  shuffleArray: function(array) {
    var range = array.length - 1;
    while (range > 0) {
      var idx = Math.floor(Math.random() * range);
      var temp = array[range];
      array[range] = array[idx];
      array[idx] = temp;
      range -= 1;
    }
  },
  empty: function(node) {
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  },
  onButtonTap: function(div, fn, module) {
    var tapManager = new TapManager(div);
    tapManager.router.when('tap', fn, { 'module': module });
    tapManager.router.when(
      'down', function buttonDown() { div.classList.add('buttonDown'); },
      { 'module': this }
    );
    tapManager.router.when(
      'up', function buttonUp() { div.classList.remove('buttonDown'); },
      { 'module': this }
    );
    return tapManager;
  },
  onButtonLongTap: function(div, ontap, onlongTap, module) {
    var tapManager = new TapManager(div);
    tapManager.router.when('tap', ontap, { 'module': module });
    tapManager.router.when('down',
      function buttonDown() { div.classList.add('buttonDown'); },
      { 'module': this }
    );
    tapManager.router.when('up',
      function buttonUp() {
        div.classList.remove('buttonDown');
        div.classList.remove('buttonLong');
      }, { 'module': this }
    );
    tapManager.router.when('long',
      function buttonLong() {
        div.classList.remove('buttonDown');
        div.classList.add('buttonLong');
      }, { 'module': this }
    );
    tapManager.router.when('longTap', onlongTap, { 'module': module });
    return tapManager;
  },
  classDiv: function(className) {
    var classDiv = document.createElement('div');
    for (var i = 0; i < arguments.length; i++) {
      classDiv.classList.add(arguments[i]);
    }
    return classDiv;
  },
  strCmp: function strCmp(a, b) {
    if (a < b)
      return -1;
    else if (a > b)
      return 1;
    return 0;
  },
  select: function(values, done, srcElem) {

    var select = document.createElement('select');
    select.style.width = '0px';
    select.style.height = '0px';

    for (var text in values) {
      var option = document.createElement('option');
      option.textContent = text;
      var value = values[text];
      if (typeof value === 'string') {
        option.value = value;
      }
      else {
        option.value = value.value;
        if (value.default)
          option.setAttribute('selected', 'selected');
      }
      select.appendChild(option);
    }

    document.body.appendChild(select);
    select.onblur = function() {
      var option = select.options[select.selectedIndex];
      done(option.value);
      document.body.removeChild(select);
    };
    setTimeout(function() {
      select.focus();
    }, 0);
  },
  logNode: function(node, level) {
    if (!level)
      level = 0;
    console.log(Array(level).join('\t') + node.classList);
    for (var i = 0; i < node.childNodes.length; i++) {
      Utils.logNode(node.childNodes[i], level + 1);
    }
  },
  onEnter: function(div, fn) {
    div.addEventListener('keypress', function(event) {
      if (event.which === 13) {
        fn(div);
        div.blur();
      }
    });
  },
  logStackTrace: function() {
    console.log(new Error().stack);
  }
};
