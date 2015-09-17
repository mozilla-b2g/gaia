import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-tabs/gaia-tabs';

export default class TabsView extends View {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'tabs-container';
    this.changeHandlers = [];
    this.tabList = ['apps', 'addons'];
  }

  onTabChange(handler) {
    if (this.changeHandlers.indexOf(handler) === -1) {
      this.changeHandlers.push(handler);
    }
  }

  onChange(evt) {
    let selected = this.tabList[this.tabs.selected];
    this.changeHandlers.forEach(handler => {
      handler(selected);
    });
  }

  render(initialTab) {
    super([this.tabList.indexOf(initialTab)]);
    // We can't create gaia-tabs with document.createElement
    // so we need to put gaia-tabs in template, and add event listeners
    // here, see https://github.com/gaia-components/gaia-tabs/issues/4
    this.tabs = this.el.querySelector('gaia-tabs');
    this.tabs.addEventListener('change', this.onChange.bind(this));
  }

  template(selected) {
    var string = `
      <gaia-tabs selected="${selected}">
        <a>Apps</a>
        <a>Add-Ons</a>
      </gaia-tabs>`;
    return string;
  }
}
