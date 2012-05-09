var ProximityHandler = {
  // XXX: due to some issue with event dispatch when the screen
  // is disabled, we just put a black div on screen for now.

  get screenOff() {
    delete this.screenOff;
    return this.screenOff = document.getElementById('screen-off');
  },

  enable: function ph_enable() {
    window.addEventListener('deviceproximity', this);
  },

  disable: function ph_disable() {
    window.removeEventListener('deviceproximity', this);
    this.screenOff.classList.remove('displayed');
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type != 'deviceproximity')
      return;

    if (evt.value == evt.min) {
      this.screenOff.classList.add('displayed');
    } else {
      this.screenOff.classList.remove('displayed');
    }
  }
};
