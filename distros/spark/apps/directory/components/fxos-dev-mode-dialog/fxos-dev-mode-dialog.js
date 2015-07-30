(function(window) {
'use strict';

var template = `<style>
.modal-dialog {
  background: #2d2d2d;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 100;
}
.modal-dialog > section {
  color: #FAFAFA;
  padding: 80px 25px 0;
  -moz-box-sizing: padding-box;
  font-size: 22px;
  line-height: 30px;
  font-weight: 300;
  width: 100%;
  display: inline-block;
  overflow-y: scroll;
  max-height: 100%;
  vertical-align: middle;
}
.modal-dialog h1 {
  font-size: 19px;
  font-weight: 400;
  line-height: 28px;
  color: #fff;
  margin: 0;
  padding-top: 10px;
}
/* Menu & buttons setup */
.modal-dialog menu {
  padding: 15px;
  background: #4d4d4d;
  display: flex;
  overflow: hidden;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
}
.modal-dialog p {
  word-wrap: break-word;
  margin: 10px 0 0;
  padding: 10px 0;
  border-top: 0.1rem solid #686868;
  line-height: 30px;
}
.modal-dialog p > span {
  padding-top: 25px;
  display: block;
}
.modal-dialog menu button {
  font-family: sans-serif;
  font-style: italic;
  width: 100%;
  height: 40px;
  margin: 0 0 10px;
  padding: 0 2px;
  font-size: 16px;
  line-height: 40px;
  -moz-box-sizing: border-box;
  display: inline-block;
  vertical-align: middle;
  background: #d8d8d8;
  border: none;
  border-radius: 20px;
  color: #333;
  text-align: center;
  -moz-margin-end: 10px;
}
/* Pressed */
.modal-dialog menu button:active {
  background: #00aacc;
  color: #fff;
}
.modal-dialog menu button:last-child {
  -moz-margin-end: 0;
}
.hidden {
  display: none;
}
</style>
<div class="modal-dialog hidden">
  <section>
    <h1>Developer Mode not enabled</h1>
    <p>To gain access to this and other customization features,
    you must enable Developer Mode.
    <span>Click Continue to go to Settings app and enable Developer Mode.</span>
    </p>
  </section>
  <menu>
    <button class="cancel">Cancel</button>
    <button class="continue">Continue</button>
  </menu>
</div>`;

var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  this.shadow = this.createShadowRoot();
  this.shadow.innerHTML = template;
  this.modalDialog = this.shadow.querySelector('.modal-dialog');
  this.cancelButton = this.shadow.querySelector('.cancel');
  this.continueButton = this.shadow.querySelector('.continue');

  this.cancelButton.addEventListener(
    'click', this.handleCancel.bind(this));
  this.continueButton.addEventListener(
    'click', this.handleContinue.bind(this));

  // If dev mode perf is enabled emit 'enabled' event else
  // show the confirm modal dialog
  navigator.getFeature('dom.apps.developer_mode').then(enabled => {
    if (enabled) {
      // Emit Enabled Event
      this.dispatchEvent(new CustomEvent('enabled'));
    } else {
      this.modalDialog.classList.remove('hidden');
    }
  });
};

proto.handleCancel = function(e) {
  window.close();
};

proto.handleContinue = function(e) {
  // Invoke Settings activity to enable developer mode
  // XXX: Bug 1163889
  var activity = new window.MozActivity({
    name: 'configure',
    data: {
      target: 'device',
      section: 'full-developer-mode'
    }
  });
  activity.onerror = function() {
    console.log('Settings configure activity error:', activity.error.name);
  };
};

try {
  document.registerElement('fxos-dev-mode-dialog', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
