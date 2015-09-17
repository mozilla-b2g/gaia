import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-header/dist/gaia-header';
import 'components/gaia-dialog/gaia-dialog-alert';
import 'components/fxos-dev-mode-dialog/fxos-dev-mode-dialog';

export default class MainView extends View {
  constructor(opts) {
    this.el = opts.el;
    this.uploadHandler = null;
  }

  render(isActivity) {
    super([isActivity]);

    if (isActivity) {
      this.el.querySelector('gaia-header').addEventListener('action', event => {
        if (event.detail.type === 'back') {
          // Back from activity should close it via ActivityHelper.
          window.dispatchEvent(new CustomEvent('request-activity-finish'));
        }
      });
    } else {
      var uploadBtn = document.getElementById('upload-link');
      if (!uploadBtn) { return; }
      uploadBtn.addEventListener('click', () => {
        if (this.uploadHandler) {
          this.uploadHandler();
        }
      });
    }
  }

  onUpload(handler) {
    this.uploadHandler = handler;
  }

  template(isActivity) {
    var action = isActivity ? 'action="back"' : '';
    var upload = isActivity ? '' : '<button id="upload-link"></button>';
    var string = `
      <gaia-header ${action}>
        <h1>Hackerplace</h1>${upload}
      </gaia-header>
      <gaia-dialog-alert id="alert-dialog">Placeholder</gaia-dialog-alert>
      <fxos-dev-mode-dialog></fxos-dev-mode-dialog>`;
    return string;
  }
}
