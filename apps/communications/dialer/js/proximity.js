'use strict';

var ProximityHandler = {
  // XXX: due to some issue with event dispatch when the screen
  // is disabled, we just put a black div on screen for now.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=753842

  get screenOff() {
    delete this.screenOff;
    return this.screenOff = document.getElementById('screen-off');
  },

  enable: function ph_enable() {
    window.addEventListener('userproximity', this);
  },

  disable: function ph_disable() {
    window.removeEventListener('userproximity', this);
    this.screenOff.classList.remove('displayed');
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type != 'userproximity')
      return;

    if (evt.near) {
      this.screenOff.classList.add('displayed');
    } else {
      this.screenOff.classList.remove('displayed');
    }
  }
};
