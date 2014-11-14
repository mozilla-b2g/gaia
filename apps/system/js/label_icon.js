/* global System, BaseUI, MobileOperator */
'use strict';

(function(exports) {
  var LabelIcon = function(manager) {
    this.manager = manager;
    this.mobileConnections = window.navigator.mozMobileConnections;
  };
  LabelIcon.prototype = Object.create(BaseUI.prototype);
  LabelIcon.prototype.constructor = LabelIcon;
  LabelIcon.REGISTERED_EVENTS = [
    'simslot-cardstatechange',
    'simslot-iccinfochange'
  ];
  LabelIcon.prototype.CLASS_LIST = 'sb-start-upper sb-icon-label';
  AlarmIcon.prototype.l10nId = '';
  LabelIcon.prototype.instanceID = 'statusbar-label';
  LabelIcon.prototype._start = function() {
    var conns = this.mobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.addEventListener('datachange', this);
          this.update();
        }
      );
    }
  };
  LabelIcon.prototype._stop = function() {
    var conns = this.mobileConnections;
    if (conns) {
      Array.from(conns).forEach(
        (conn) => {
          conn.removeEventListener('datachange', this);
        }
      );
    }
  };
  LabelIcon.prototype.update = function() {
    var conns = this.mobileConnections;
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
  };
  exports.LabelIcon = LabelIcon;
}(window));
