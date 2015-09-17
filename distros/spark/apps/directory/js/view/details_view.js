import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-header/dist/gaia-header';
import 'components/gaia-sub-header/gaia-sub-header';
import 'components/gaia-list/gaia-list';
import 'components/gaia-button/gaia-button';
import { IconHelper, AppsHelper, ManifestHelper } from 'js/lib/helpers';

function capitalize(string) {
  return string[0].toUpperCase() + string.slice(1);
}

export default class DetailsView extends View {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'app-details';
    this.el.classList.add('popup');
    this.closeHandlers = [];
    this.installHandlers = [];
  }

  render() {
    super();
    this.titleElement = this.el.querySelector('#details-title');
    this.itemElement = this.el.querySelector('.item');
    this.nameElement = this.el.querySelector('.name');
    this.iconElement = this.el.querySelector('.icon');
    this.authorElement = this.el.querySelector('.author');
    this.fullDescription = this.el.querySelector('#full-description');
    this.addonSection = this.el.querySelector('#addon-section');
    this.affectedApps = this.el.querySelector('#affected-apps');
    this.installButton = this.el.querySelector('.install-button');
    this.repoLink = this.el.querySelector('#repo-link');

    this.installButton.addEventListener('click', () => {
      this.installHandlers.forEach(handler => {
        handler(this.details);
      });
    });
    this.closeButton = this.el.querySelector('#close-button');
    this.closeButton.addEventListener('click', () => {
      this.closeHandlers.forEach(handler => {
        handler();
      });
    });
  }

  filterNonAffectedApps(apps, addonManifest) {
    var filters = addonManifest.customizations.map(customization => {
      return new RegExp(customization.filter);
    });

    return apps.filter(app => {
      if (!app.manifest) {
        console.log('Could not filter app, manifest not found', app.name);
        return false;
      }
      // Make sure the addon has appropriate privs against the app.
      if (!ManifestHelper.hasHigherPriviledges(addonManifest, app.manifest)) {
        return false;
      }
      // Test the apps launch URL against each customization filter
      // and mark the app as affected if it matches at least one.
      var launchPath = app.manifest.launch_path || '';
      var launchURL = new URL(launchPath, app.manifestURL).href;
      return filters.find(filter => {
        return filter.test(launchURL);
      });
    });
  }

  dedupeAppNames(apps) {
    return apps.map(app => {
      return app.manifest.name;
    }).filter((appName, index, appNames) => {
      return appNames.indexOf(appName) === index;
    });
  }

  populateAffectedApps(details) {
    Promise.all([
      AppsHelper.getAllApps(),
      ManifestHelper.getManifest(details.manifestURL)
    ]).then(results => {
      var apps = results[0];
      var addonManifest = results[1];
      if (!addonManifest) {
        // If we cannot fetch addon manifest, we cannot display addon info.
        this.affectedApps.textContent =
          'Cannot determine affected apps, invalid manifest URL.';
      } else {
        var filteredApps = this.filterNonAffectedApps(apps, addonManifest);

        var affectedAppList;
        if (apps.length === filteredApps.length) {
          affectedAppList = 'All applications.';
        } else {
          affectedAppList = this.dedupeAppNames(filteredApps).join(', ');
        }
        this.affectedApps.textContent = affectedAppList || 'None';
      }
    }).catch((err) => {
      console.warn('Could not populate affected apps', err);
      // Hide affected apps section when undetermined.
      this.addonSection.hidden = true;
    });
  }

  show(details) {
    this.details = details;
    this.itemElement.classList.toggle('installed', details.installed);
    this.itemElement.classList.toggle('addon', (details.type === 'addon'));
    this.titleElement.textContent = capitalize(details.name);
    IconHelper.setImage(this.iconElement, details.icon);
    this.nameElement.textContent = capitalize(details.name);
    this.authorElement.textContent = details.author;
    this.fullDescription.textContent = details.description;
    this.installButton.textContent = details.installed ? 'Open' : 'Install';
    this.installButton.classList.toggle('installed', details.installed);
    this.installButton.disabled = false;
    this.addonSection.hidden = true;
    if (details.url) {
      this.repoLink.parentElement.hidden = false;
      this.repoLink.href = details.url;
      this.repoLink.textContent = details.url;
    } else {
      this.repoLink.parentElement.hidden = true;
    }

    // Addons need the affected apps section, and no Open button.
    if (details.type === 'addon') {
      if (details.installed) {
        this.installButton.textContent = 'Installed';
        this.installButton.disabled = true;
      }
      this.addonSection.hidden = false;
      this.populateAffectedApps(details);
    }

    this.el.classList.add('active');
  }

  hide() {
    this.el.classList.remove('active');
  }

  isShowing(manifestURL) {
    return this.el.classList.contains('active') &&
      this.details.manifestURL === manifestURL;
  }

  onClose(handler) {
    if (this.closeHandlers.indexOf(handler) === -1) {
      this.closeHandlers.push(handler);
    }
  }

  onInstall(handler) {
    if (this.installHandlers.indexOf(handler) === -1) {
      this.installHandlers.push(handler);
    }
  }

  template() {
    var string = `
      <gaia-header>
        <a id="close-button" class="close"><i data-icon="close"></i></a>
        <h1 id="details-title">App Details</h1>
      </gaia-header>
      <gaia-list class="info-list install-list">
        <li class="item">
          <img class="icon" />
          <div flex class="description">
            <p class="name"></p>
            <p class="author"></p>
          </div>
          <span class="install-info">Installed</span>
          <gaia-button class="install-button"></gaia-button>
        </li>
      </gaia-list>
      <p id="full-description"></p>
      <p id="repo"><a target="_blank" id="repo-link"></a></p>
      <div id="addon-section">
        <gaia-sub-header>Affected Apps</gaia-sub-header>
        <p id="affected-apps"></div>
      </div>`;
    return string;
  }
}
