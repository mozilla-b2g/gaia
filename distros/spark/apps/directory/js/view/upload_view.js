import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-header/dist/gaia-header';
import 'components/gaia-list/gaia-list';
import 'gaia-icons';
import 'components/gaia-text-input/gaia-text-input';
import 'components/gaia-text-input/gaia-text-input-multiline';
import { IconHelper } from 'js/lib/helpers';
import ListModel from 'js/model/list_model';

var UPLOAD_URL = 'http://henretty.us/upload';

export default class UploadView extends View {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'uploads';
    this.el.classList.add('popup');
    this.currentApp = null;

    this.uploadBlacklist = [
      'app://ee50b34d-c8ce-b941-8020-5bc4693c770c/manifest.webapp',//FxStumbler
      'https://webmaker-app.mofostaging.net/manifest.webapp',
      'app://a9c7eb67-c2c8-8845-b150-5dd0a850200c/manifest.webapp',//Hackerplace
      'app://7a6c01c5-32fd-d041-9d0c-a70bb6c7c752/manifest.webapp',
      'app://customizer.gaiamobile.org/manifest.webapp',
      'app://default_theme.gaiamobile.org/manifest.webapp'
    ];
    // Add current directory apps to upload blacklist.
    var directoryApps = (new ListModel()).getAppList();
    for (var manifestURL in directoryApps) {
      this.uploadBlacklist.push(manifestURL);
    }
  }

  render() {
    super();
    this.closeButton = this.$('.close');
    this.cancelButton = this.$('#upload-cancel');
    this.submitButton = this.$('#upload-submit');
    this.list = this.$('#upload-list');
    this.displayName = this.$('#display-name');
    this.displayIcon = this.$('#display-icon');
    this.nameInput = this.$('#upload-name');
    this.descriptionInput = this.$('#upload-description');
    this.alertDialog = document.body.querySelector('#alert-dialog');

    this.closeButton.addEventListener('click', this.hide.bind(this));
    this.cancelButton.addEventListener('click', this.hideForm.bind(this));
    this.submitButton.addEventListener('click', this.upload.bind(this));
    this.createList();
  }

  showAlertDialog(msg) {
    this.alertDialog.textContent = msg;
    this.alertDialog.open();
  }

  isEligible(app) {
    if (this.uploadBlacklist.indexOf(app.manifestURL) !== -1) {
      return false;
    }
    // We don't support themes at the moment.
    if (app.manifest.role === 'theme') {
      return false;
    }
    // All non-blacklisted add-ons are eligible.
    if (app.manifest.role === 'addon') {
      return true;
    }
    // Only non-gaia non-marketplace apps are eligible for hackerplace.
    return (app.removable &&
      app.installOrigin !== 'https://marketplace.firefox.com');
  }

  createList() {
    var req;
    if (navigator.mozApps.mgmt) {
      req = navigator.mozApps.mgmt.getAll();
    } else {
      req = navigator.mozApps.getInstalled();
    }
    req.onsuccess = () => {
      var apps = req.result;
      var atLeastOneEligibleApp = false;
      apps.forEach(app => {
        if (this.isEligible(app)) {
          atLeastOneEligibleApp = true;
          var item = document.createElement('li');
          var icon = this.getIconUrl(app.manifest, app.origin);
          item.classList.add('item');
          item.innerHTML = this.itemTemplate(app.manifest);
          IconHelper.setImage(item.querySelector('.icon'), icon);
          this.list.appendChild(item);
          item.addEventListener('click', this.showForm.bind(this, app));
        }
      });

      // Inform user if we did not find any uploadable apps.
      if (!atLeastOneEligibleApp) {
        var item = document.createElement('li');
        item.textContent = 'No apps or addons to upload.';
        this.list.appendChild(item);
        return;
      }
    };
    req.onerror = e => {
      console.log('Unable to fetch installed apps.', e);
    };
  }

  getIconUrl(manifest, origin) {
    if (!manifest || !manifest.icons) {
      return null;
    }
    var url;
    for (var size in manifest.icons) {
      url = manifest.icons[size];
    }
    // If we are given a relative path, we naively append app origin
    // to construct the full icon path.
    if (url.startsWith('/')) {
      url = origin + url;
    }
    return url;
  }

  showForm(app) {
    this.nameInput.value =
      app.manifest.developer && app.manifest.developer.name || '';
    this.descriptionInput.value = app.manifest.description || '';
    this.currentApp = app;
    this.displayName.textContent = app.manifest.name;
    IconHelper.setImage(this.displayIcon,
      this.getIconUrl(app.manifest, app.origin));
    this.el.classList.add('form');
  }

  hideForm(app) {
    this.nameInput.value = '';
    this.descriptionInput.value = '';
    this.currentApp = null;
    this.el.classList.remove('form');
  }

  show() {
    this.el.classList.add('active');
  }

  hide() {
    this.el.classList.remove('active');
  }

  upload() {
    if (!this.currentApp) {
      this.showAlertDialog('Error: current app not found');
      this.hideForm();
      return;
    }

    if (this.nameInput.value === '') {
      this.showAlertDialog('You must fill out a name');
      return;
    }

    this.currentApp.export().then((blob) => {
      var name = encodeURIComponent(this.nameInput.value);
      var description = encodeURIComponent(this.descriptionInput.value);
      var url = `${UPLOAD_URL}?name=${name}&description=${description}`;
      var ajax = new XMLHttpRequest();
      ajax.open('POST', url, true);
      ajax.onload = () => {
        console.log('Upload complete');
      };
      ajax.error = e => {
        this.showAlertDialog('App upload failed, ' + e);
        console.log('Upload failed', e);
      };
      ajax.send(blob);
      this.showAlertDialog(
        'Upload success! We will now review your app for the Hackerplace.');
      this.hideForm();
    }).then(() => window.dispatchEvent(new CustomEvent('achievement-rewarded', {
      detail: {
        criteria: 'achievements/content-commander',
        evidence: 'urn:fxos-directory:app:uploaded',
        name: 'Content Commander',
        description: 'Submit an app or add-on to Hackerplace',
        image: './img/content-commander.png'
      }
    }))).catch(e => {
      this.showAlertDialog('Error exporting app');
      console.log('Error exporting app', e);
    });
  }

  itemTemplate({ name }) {
    var string = `
      <img class="icon" />
      <div flex class="description">
        <p class="name">${name}</p>
      </div>
      <i data-icon="forward"></i>`;
    return string;
  }

  template() {
    var string = `
      <gaia-header>
        <a class="close"><i data-icon="close"></i></a>
        <h1 id="upload-title">Upload</h1>
      </gaia-header>
      <gaia-list id="upload-list" class="install-list"></gaia-list>
      <div id="upload-form">
        <gaia-list class="info-list install-list">
          <li class="item">
            <img id="display-icon" class="icon" />
            <div flex class="description">
              <p id="display-name" class="name"></p>
            </div>
          </li>
        </gaia-list>
        <div id="form-fields">
          <label>Tell us your name&nbsp;<span class="red">*</span></label>
          <gaia-text-input id="upload-name"></gaia-text-input>
          <label>App Description (optional)</label>
          <gaia-text-input-multiline id="upload-description">
          </gaia-text-input-multiline>
          <section id="upload-buttons">
            <gaia-button id="upload-cancel">Cancel</gaia-button>
            <gaia-button id="upload-submit">Upload</gaia-button>
          </section>
        </div>
      </div>`;
    return string;
  }
}
