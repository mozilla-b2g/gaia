/**
 * Do the required global namespace clobbering for our node binding friends.
 **/

(function () {

// Like setTimeout, but only takes a function argument.  There's
// no time argument (always zero) and no arguments (you have to
// use a closure).
function setZeroTimeout(fn) {
  setTimeout(fn);
}

// Add the one thing we want added to the window object.
window.setZeroTimeout = setZeroTimeout;

window.process = {
  immediate: false,
  nextTick: function(cb) {
    if (this.immediate)
      cb();
    else
      window.setZeroTimeout(cb);
  }
};

}());

