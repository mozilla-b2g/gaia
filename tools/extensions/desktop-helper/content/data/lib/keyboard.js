!function() {

  // Invoke the keyboard if we're viewing that page
  if (/keyboard.gaiamobile.org/.test(location.href) && parent == window) {
    setTimeout(function() {
      window.navigator.mozKeyboard.onfocuschange({detail: {type: 'text', value: 'foo'}});
    }, 300);
  }

  FFOS_RUNTIME.makeNavigatorShim('mozKeyboard', {
    onfocuschange: function() {
      console.log('keyboard onfocus change');
    }
  }, true);
}();
