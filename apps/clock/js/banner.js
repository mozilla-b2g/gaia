var BannerView = {

  _remainHours: 0,
  _remainMinutes: 0,

  get bannerCountdown() {
    delete this.bannerCountdown;
    return this.bannerCountdown = document.getElementById('banner-countdown');
  },

  init: function BV_init() {
    this.bannerCountdown.addEventListener('click', this);
  },

  handleEvent: function al_handleEvent(evt) {
    this.hideBannerStatus();
  },

  calRemainTime: function BV_calRemainTime(targetTime) {
    var now = new Date();
    var remainTime = targetTime.getTime() - now.getTime();
    this._remainHours = Math.floor(remainTime / (60 * 60 * 1000)); // per hour
    this._remainMinutes = Math.floor((remainTime / (60 * 1000)) -
                          (this._remainHours * 60)); // per minute
  },

  setStatus: function BV_setStatus(nextAlarmFireTime) {
    this.calRemainTime(nextAlarmFireTime);

    var innerHTML = '';
    if (this._remainHours === 0) {
      innerHTML = _('countdown-lessThanAnHour', {
        minutes: _('nMinutes', { n: this._remainMinutes })
      });
    } else if (this._remainHours < 24) {
      innerHTML = _('countdown-moreThanAnHour', {
        hours: _('nHours', { n: this._remainHours }),
        minutes: _('nRemainMinutes', { n: this._remainMinutes })
      });
    } else {
      var remainDays = Math.floor(this._remainHours / 24);
      var remainHours = this._remainHours - (remainDays * 24);
      innerHTML = _('countdown-moreThanADay', {
        days: _('nRemainDays', { n: remainDays }),
        hours: _('nRemainHours', { n: remainHours })
      });
    }
    this.bannerCountdown.innerHTML = '<p>' + innerHTML + '</p>';

    this.showBannerStatus();
    var self = this;
    window.setTimeout(function cv_hideBannerTimeout() {
      self.setBannerStatus(false);
    }, 4000);
  },

  setBannerStatus: function BV_setBannerStatus(visible) {
    if (visible) {
      this.bannerCountdown.classList.add('visible');
    } else {
      this.bannerCountdown.classList.remove('visible');
    }
  },

  showBannerStatus: function BV_showBannerStatus() {
    this.setBannerStatus(true);
  },

  hideBannerStatus: function BV_hideBannerStatus() {
    this.setBannerStatus(false);
  }
};
BannerView.init();
