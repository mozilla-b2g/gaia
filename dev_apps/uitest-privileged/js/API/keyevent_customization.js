'use stricts';

(function() {

  function $(id) {
    return document.getElementById(id);
  }

  var keyEventCustomization = {
    init: function ke_init() {
      window.addEventListener('keydown', this);
      window.addEventListener('keyup', this);
    },

    handleEvent: function ke_handleEvent(e) {
      // We shows event information at received-event.
      $('received-event').textContent = e.key + ' ' + e.type;
      switch(e.key) {
        case 'VolumeDown':
        case 'VolumeUp':
          if ($('override-volume-keys').checked) {
            $('received-event').textContent += ' default prevented';
            // if override keys is checked, we should prevent default.
            e.preventDefault();
          }
          break;
        case 'Power':
        case 'Exit':
        case 'Home':
          if ($('override-power-exit-keys').checked) {
            $('received-event').textContent += ' default prevented';
            // if override keys is checked, we should prevent default.
            e.preventDefault();
          }
          break;
      }
    }
  };

  keyEventCustomization.init();
})();
