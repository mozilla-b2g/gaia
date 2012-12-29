Evme.Banner = new function Evme_Banner() {
    var NAME = 'Banner', self = this,
        el = null, timer_id = null, messageContainer = null;

    this.init = function init(options) {
        !options && (options = {});

        el = options.el;
        messageContainer = el.querySelector('p');
        Evme.EventHandler.trigger(NAME, 'init');
    };

    this.show = function show(message, latency) {
        if (timer_id)
            clearTimeout(timer_id);

        latency = latency || 4000;
        timer_id = setTimeout((function bannerTimeout() {
            timer_id = null;
            this.hide();
        }).bind(this), latency);

        messageContainer.innerHTML = message;
        el.classList.add('visible');
    };

    this.hide = function hide() {
        el.classList.remove('visible');
    };

    this.getElement = function getElement() {
        return el;
    };
}
