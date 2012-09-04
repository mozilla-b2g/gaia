(function(window) {

  if (typeof(window.Calendar) === 'undefined') {
    window.Calendar = {};
  }

  //Adding shim if we need to add compat later.
  function SetObject() {
    return new Set();
  }

  Calendar.Set = SetObject;
}(this));
