'use strict';
/* global Sanitizer */
/* exported Templates */
var Templates = {
  soundList: function({l10nID}) {
    return Sanitizer.escapeHTML `
      <section hidden>
        <gaia-subheader skin="organic">
          <span data-l10n-id="${l10nID}"></span>
        </gaia-subheader>
        <ul data-type="list"></ul>
      </section>`;
  },

  soundItem: function({l10nID, name}) {
    return Sanitizer.escapeHTML `
      <li>
        <aside class="pack-end">
          <a class="actions-button"></a>
        </aside>
        <div class="desc">
          <div class="play-icon"></div>
          <p class="name"><bdi data-l10n-id="${l10nID}">${name}</bdi></p>
        </div>
      </li>`;
  }
};
