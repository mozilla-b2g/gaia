window.View = (function() {

var debug = 1 ? (...args) => console.log('[View]', ...args) : () => {};

function View() {
  this.params = {};

  window.parent.location.search.substr(1).split('&').forEach((param) => {
    var parts = param.split('=');
    this.params[parts[0]] = parts[1];
  });

  var title = typeof this.title === 'function' ? this.title() : this.title;
  if (title instanceof Promise) {
    title.then(title => window.parent.setHeaderTitle(title));
  }

  else {
    window.parent.setHeaderTitle(title);
  }

  window.addEventListener('click', (evt) => {
    var link = evt.target.closest('a');
    if (link) {
      debug('Received "click" event on link', link);
      evt.preventDefault();
      window.parent.navigateToURL(link.getAttribute('href'));
    }
  });

  window.addEventListener('viewdestroy', () => this.destroy());
}

View.prototype.destroy = function() {
  Object.getOwnPropertyNames(this).forEach(prop => this[prop] = null);
};

View.prototype.title = '';

View.prototype.render = function() {
  if (window.frameElement) {
    window.frameElement.dispatchEvent(new CustomEvent('rendered'));
  }

  debug('Rendered');
};

View.preserveListScrollPosition = function(list) {
  var lastScrollTop;
  window.addEventListener('viewhidden', () => {
    lastScrollTop = list._list.scrollTop;
  });

  window.addEventListener('viewvisible', () => {
    list._list.scrollInstantly(lastScrollTop);
  });
};

View.extend = function(subclass) {
  subclass.prototype = Object.create(View.prototype, {
    constructor: {
      value: subclass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  // subclass.__proto__ = View;

  return subclass;
};

return View;

})();
