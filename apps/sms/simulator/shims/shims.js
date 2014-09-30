'use strict';

(function(exports) {
  var list = [];
  var dictionary = {};

  function contribute(name, object) {
    dictionary[name] = object;
    list.push(name);
  }

  function forEach(task) {
    list.forEach(function(name) {
      var shim = dictionary[name];
      task(shim, name);
    });
  }

  function injectTo(fwindow) {
    forEach(function(shim) {
      shim.injectTo && shim.injectTo(fwindow);
    });
  }

  function teardown(fwindow) {
    forEach(function(shim) {
      shim.teardown && shim.teardown(fwindow);
    });
  }

  function render(container) {
    forEach(function(shim, name) {
      if (shim.render) {
        var line = document.createElement('div');
        line.classList.add('line', name.toLowerCase());
        shim.render(line);

        var title = document.createElement('h3');
        title.textContent = name;
        container.appendChild(title);
        container.appendChild(line);
      }
    });
  }

  function get(name) {
    return dictionary[name] ? dictionary[name] : null;
  }

  exports.Shims = {
    contribute: contribute,
    injectTo: injectTo,
    render: render,
    teardown: teardown,
    get: get
  };
})(window);
