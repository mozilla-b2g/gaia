import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-list/gaia-list';
import 'components/gaia-button/gaia-button';
import { IconHelper } from 'js/lib/helpers';

function capitalize(string) {
  return string[0].toUpperCase() + string.slice(1);
}

export default class ListView extends View {
  constructor() {
    this.el = document.createElement('gaia-list');
    this.el.className = 'install-list';

    this.elements = Object.create(null);
    this.installHandlers = [];
    this.detailsHandlers = [];
  }

  update(list) {
    for (let manifestURL in list) {
      let data = list[manifestURL];
      if (!this.elements[manifestURL]) {
        this.elements[manifestURL] = this.addElement(data);
      }
      this.updateElement(this.elements[manifestURL], data);
    }
  }

  onInstall(handler) {
    if (this.installHandlers.indexOf(handler) === -1) {
      this.installHandlers.push(handler);
    }
  }

  offInstall(handler) {
    var index = this.installHandlers.indexOf(handler);
    if (index !== -1) {
      this.installHandlers.splice(index, 1);
    }
  }

  onDetails(handler) {
    if (this.detailsHandlers.indexOf(handler) === -1) {
      this.detailsHandlers.push(handler);
    }
  }

  offDetails(handler) {
    var index = this.detailsHandlers.indexOf(handler);
    if (index !== -1) {
      this.detailsHandlers.splice(index, 1);
    }
  }

  addElement(data) {
    var item = document.createElement('li');
    item.classList.add('item', data.type);
    item.innerHTML = this.listItemTemplate(data);
    IconHelper.setImage(item.querySelector('.icon'), data.icon);
    this.el.appendChild(item);

    item.addEventListener('click', function(manifestURL, evt) {
      if (evt.target.classList.contains('install-button')) {
        return;
      }
      this.detailsHandlers.forEach(handler => {
        handler(manifestURL);
      });
    }.bind(this, data.manifestURL));

    item.querySelector('.install-button').addEventListener('click',
      function(data) {
        this.installHandlers.forEach(handler => {
          handler(data);
        });
      }.bind(this, data));

    return item;
  }

  updateElement(element, data) {
    element.classList.toggle('installed', data.installed);
    var button = element.querySelector('.install-button');
    button.textContent = data.installed ? 'Open' : 'Install';
    var icon = element.querySelector('.icon');
    if (data.icon && icon.src !== data.icon) {
      IconHelper.setImage(icon, data.icon);
    }
  }

  activate() {
    this.el.classList.add('active');
  }

  deactivate() {
    this.el.classList.remove('active');
  }

  listItemTemplate({ name, author }) {
    var string = `
      <img class="icon" />
      <div flex class="description">
        <p class="name">${capitalize(name)}</p>
        <p class="author">${author}</p>
      </div>
      <span class="install-info">Installed</span>
      <gaia-button class="install-button">Loading...</gaia-button>`;
    return string;
  }

}
