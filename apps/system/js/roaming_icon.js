/* global BaseIcon, Service */
'use strict';

(function(exports) {
  var RoamingIcon = function(manager, index) {
    BaseIcon.call(this, manager, index);
  };
  RoamingIcon.prototype = Object.create(BaseIcon.prototype);
  RoamingIcon.prototype.name = 'RoamingIcon';
  RoamingIcon.prototype.DEBUG = false;
  RoamingIcon.prototype.view = function() {
    // jshint ignore: start
    var index = this.index;
    return `<div class="sb-icon sb-icon-roaming" role="listitem" data-index="${index}">
            </div>`;
    // jshint ignore: end
  };
  RoamingIcon.prototype.render = function() {
    this.debug('renderring...');
    this.containerElement =
      document.getElementById('statusbar-mobile-connection');
    this.containerElement.insertAdjacentHTML('beforeend', this.view());
    this.element =
      this.containerElement.querySelector('.sb-icon-roaming[data-index="' +
      this.index + '"]');
  };
  RoamingIcon.prototype.update = function() {
    var simslot = this.manager;
    var conn = simslot.conn;
    var voice = conn.voice;
    var data = conn.data;

    if (!voice || !this.element) {
      this.debug('no element or no voice');
      return;
    }

    if (!Service.query('Radio.enabled')) {
      this.debug('radio disabled');
      this.hide();
      return;
    }

    if (simslot.isAbsent() || simslot.isLocked()) {
      this.debug('simcard absent or locked');
      this.hide();
    } else if (data && data.connected && data.type.startsWith('evdo')) {
      this.debug('data roaming?', data.roaming);
      data.roaming ? this.show() : this.hide();
    } else if (voice.connected || Service.query('hasActiveCall', this.index)) {
      this.debug('voice roaming?', voice.roaming);
      voice.roaming ? this.show() : this.hide();
    } else {
      this.hide();
    }
  };
  exports.RoamingIcon = RoamingIcon;
}(window));
