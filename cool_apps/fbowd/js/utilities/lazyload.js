'use strict';

const lazyload = (function(doc) {

  window.console.log('Lazy Load!');

  var container, items, containerHeight, latency = 300,
      callback, timeout, itemsSelector;

  var lastViewTop = 0, index = 0, total;

  var init = function init(_containerSel, _itemsSel, fn) {
    container = doc.querySelector(_containerSel);
    itemsSelector = _itemsSel;
    items = doc.querySelectorAll(itemsSelector);

    containerHeight = container.clientHeight;

    window.console.log('Container Height: ',containerHeight);

    total = items.length;
    callback = fn;

    container.addEventListener('scroll', onScroll);

    // Initial check if items should appear
    update();
  }

  var reload = function reload() {
    items = doc.querySelectorAll(itemsSelector);
    total = items.length;
    lastViewTop = 0,
    index = 0;

    // Initial check if items should appear
    update();
  }

  var onScroll = function onScroll() {
    window.console.log('Scrolling!');
    clearTimeout(timeout);
    timeout = setTimeout(function() { update() }, latency);
  }

  var update = function update() {
     window.console.log('Update!');

    var ret = [];

    var viewTop = container.scrollTop;
    var viewBottom = viewTop + containerHeight;

    if (!index || lastViewTop > viewTop) {
      index = 0;
    }

    for (; index < total; index++) {
      var item = items[index];
      var placed = whereIsTheItem(item, viewTop, viewBottom);

      if (placed.below) {
        break;
      }

      if (placed.inside && !item.loaded) {
        ret.push(item);
        item.loaded = true;
      }

    }

    lastViewTop = viewTop;

    if (ret.length > 0) {
      callback(ret);
    }
  }

  var whereIsTheItem = function whereIsTheItem(item, viewTop, viewBottom) {
    var elemTop = item.offsetTop;
    var elemBottom = elemTop + item.clientHeight;
    return {
      'inside': ((elemBottom >= viewTop) && (elemTop <= viewBottom)),
      'below': elemTop > viewBottom
    };
  }

  return {
    'init': init,
    'reload': reload
  };

})(document);
