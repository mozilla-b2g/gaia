/* global System, BaseUI, MobileOperator */
'use strict';

(function(exports) {
  var LabelIcon = function(manager) {
    this.manager = manager;
  };
  LabelIcon.prototype = Object.create(BaseUI.prototype);
  LabelIcon.prototype.constructor = LabelIcon;
  LabelIcon.prototype.EVENT_PREFIX = 'LabelIcon';
  LabelIcon.prototype.containerElement = document.getElementById('statusbar');
  LabelIcon.prototype.view = function() {
    return '<div id="statusbar-label" class="sb-start-upper sb-icon-label" ' +
            'role="listitem"></div>';
  };
  LabelIcon.prototype.instanceID = 'statusbar-label';
  LabelIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  LabelIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  LabelIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  LabelIcon.prototype.start = function() {
    // Listen to Custom event send by 'nfc_manager.js'
    window.addEventListener('simslot-cardstatechange', this);
    window.addEventListener('simslot-iccinfochange', this);
    this.addConnectionsListeners();
    this.update();
  };
  LabelIcon.prototype.stop = function() {
    window.removeEventListener('simslot-cardstatechange', this);
    window.removeEventListener('simslot-iccinfochange', this);
    this.removeConnectionsListeners();
  };
  LabelIcon.prototype.handleEvent = function() {
    this.update();
  };
  LabelIcon.prototype.addConnectionsListeners = function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.addEventListener('datachange', this);
          this.update();
        }
      );
    }
  };
  LabelIcon.prototype.removeConnectionsListeners = function() {
    var conns = window.navigator.mozMobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.removeEventListener('datachange', this);
        }
      );
    }
  };
  LabelIcon.prototype.setActive = function(active) {
    this.update();
  };
  LabelIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  LabelIcon.prototype.updateTime = function(now) {
    var label = this.element;
    var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');
    l10nArgs.date = f.localeFormat(now, _('statusbarDateFormat'));
    label.dataset.l10nArgs = JSON.stringify(l10nArgs);
    this.update();
  };
  LabelIcon.prototype.update = function() {
    var icon = this.element;

    var conns = window.navigator.mozMobileConnections;
    var conn;

    // Do not show carrier's name if there are multiple sim cards.
    if (conns && conns.length == 1) {
      conn = conns[0];
    }

    var self = this;
    var label = this.element;
    var previousLabelContent = label.textContent;
    var l10nArgs = JSON.parse(label.dataset.l10nArgs || '{}');

    if (!conn || !conn.voice || !conn.voice.connected ||
        conn.voice.emergencyCallsOnly) {
      delete l10nArgs.operator;
      label.dataset.l10nArgs = JSON.stringify(l10nArgs);

      label.dataset.l10nId = '';
      label.textContent = l10nArgs.date;

      if (previousLabelContent !== label.textContent) {
        this.manager.updateLabelWidth(this.element);
      }

      return;
    }

    var operatorInfos = MobileOperator.userFacingInfo(conn);
    l10nArgs.operator = operatorInfos.operator;

    if (operatorInfos.region) {
      l10nArgs.operator += ' ' + operatorInfos.region;
    }

    label.dataset.l10nArgs = JSON.stringify(l10nArgs);

    label.dataset.l10nId = 'statusbarLabel';
    label.textContent = navigator.mozL10n.get('statusbarLabel', l10nArgs);

    if (previousLabelContent !== label.textContent) {
      this.manager.updateLabelWidth(this.element);
    }

    this.manager._updateIconVisibility();
  };
}(window));
