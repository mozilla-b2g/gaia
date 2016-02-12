/* global BaseIcon, MobileOperator */
'use strict';

(function(exports) {
  var OperatorIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  OperatorIcon.prototype = Object.create(BaseIcon.prototype);
  OperatorIcon.prototype.name = 'OperatorIcon';
  OperatorIcon.prototype.onrender = function() {
    if (!this._observer) {
      this._observer = new MutationObserver(this._handleTextChanged.bind(this));
    }
    this._observer.observe(this.element,
      { characterData: true, childList: true });
  };

  OperatorIcon.prototype.containerElement =
    document.getElementById('statusbar-tray') ||
    document.createElement('div');

  OperatorIcon.prototype._handleTextChanged = function() {
    if (this.previousTextContent === this.element.textContent) {
      return;
    }
    this.previousTextContent = this.element.textContent;
    this.publish('widthchanged');
  };
  OperatorIcon.prototype._stop = function() {
    this._observer && this._observer.disconnect();
  };

  OperatorIcon.prototype.view = function view() {
    return `<div id="statusbar-operator"
              class="sb-start-upper sb-icon-operator statusbar-operator"
              role="listitem">
            </div>`;
  };

  OperatorIcon.prototype.update = function(now) {
    if (!this.element || !this.enabled()) {
      return;
    }
    this.show();

    now = now || new Date();
    var l10nArgs = JSON.parse(this.element.dataset.l10nArgs || '{}');
    l10nArgs.date = now.toLocaleString(navigator.languages, {
      month: 'short',
      day: 'numeric'
    });
    var conns = this.manager.mobileConnections;
    var conn;

    // Do not show carrier's name if there are multiple sim cards.
    if (conns && conns.length == 1) {
      conn = conns[0];
    }

    var label = this.element;

    if (!conn || !conn.voice || !conn.voice.connected ||
        conn.voice.emergencyCallsOnly) {
      delete l10nArgs.operator;
      label.dataset.l10nArgs = JSON.stringify(l10nArgs);

      label.dataset.l10nId = '';
      label.textContent = l10nArgs.date;
      return;
    }

    var operatorInfos = MobileOperator.userFacingInfo(conn);
    l10nArgs.operator = operatorInfos.operator;

    if (operatorInfos.region) {
      l10nArgs.operator += ' ' + operatorInfos.region;
    }

    document.l10n.setAttributes(label, 'statusbarOperator', l10nArgs);
  };
  exports.OperatorIcon = OperatorIcon;
}(window));
