Evme.Banner = new function Evme_Banner() {
  var NAME = 'Banner', self = this,
    el = null, timerId = null;

  this.init = function init(options) {
    !options && (options = {});

    el = options.el;

    el.addEventListener('transitionend', function onTransitionEnd() {
      if (!el.classList.contains('visible')) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
    });

    el.style.display = 'none';
    Evme.EventHandler.trigger(NAME, 'init');
  };

  this.show = function show(property, args, latency) {
    if (timerId) {
      window.clearTimeout(timerId);
    }

    latency = latency || 4000;
    timerId = window.setTimeout(self.hide, latency);

    el.innerHTML =
      '<p class="noreset">' + Evme.Utils.l10n(NAME, property, args) + '</p>';
    el.style.display = 'block';
    setTimeout(function repainted() {
      el.classList.add('visible');
      Evme.EventHandler.trigger(NAME, 'show');
    });
  };

  this.hide = function hide() {
    timerId = null;
    el.classList.remove('visible');

    Evme.EventHandler.trigger(NAME, 'hide');
  };

  this.getElement = function getElement() {
    return el;
  };
}
