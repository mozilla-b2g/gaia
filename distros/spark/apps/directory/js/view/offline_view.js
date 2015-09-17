import { View } from 'components/fxos-mvc/dist/mvc';
import 'components/gaia-list/gaia-list';

export default class OfflineView extends View {
  constructor() {
    super();

    this.el = document.createElement('gaia-list');
    this.el.id = 'offline-container';
  }

  update(online) {
    // XXX: A bit gross. We should probably set this on the el only, but we had
    // issues with sibling selectors.
    document.body.classList.toggle('online', online);
  }

  template() {
    var string =
      `<li flex>
         <i data-icon="exclamation"></i>
         <p>You have no internet connection. Enable data or WiFi to refresh the
         app list.</p>
       </li>`;
    return string;
  }
}
