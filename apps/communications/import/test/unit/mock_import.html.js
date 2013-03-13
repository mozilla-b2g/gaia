var MockImportHtml = '<section role="region" id="content" class="import">';

MockImportHtml += '     <header>';
MockImportHtml += '        <a href="#" id="import-close">';
MockImportHtml += '          <span class="icon icon-close" data-l10n-id="close">close</span>';
MockImportHtml += '        </a>';
MockImportHtml += '        <menu type="toolbar">';
MockImportHtml += '          <button  id="import-action" data-l10n-id="import" disabled>';
MockImportHtml += '            Import';
MockImportHtml += '          </button>';
MockImportHtml += '        </menu>';
MockImportHtml += '        <h1 data-l10n-id="fbFriends">Facebook Friends</h1>';
MockImportHtml += '     </header>';

MockImportHtml += '      <section id="main">';

MockImportHtml += '        <section id="mainContent" data-state="selection">';
MockImportHtml += '          <form id="search-container" role="search" class="search">';
MockImportHtml += '            <p>';
MockImportHtml += '              <label for="search" id="search-start">';
MockImportHtml += '                <input type="search" name="search" class="textfield" placeholder="Search" data-l10n-id="search-contact">';
MockImportHtml += '              </label>';
MockImportHtml += '            </p>';
MockImportHtml += '          </form>';

MockImportHtml += '          <section class="friends-msg">';
MockImportHtml += '            <output id="num-friends" hidden></output>';
MockImportHtml += '            <p id="friends-msg"></p>';
MockImportHtml += '          </section>';
MockImportHtml += '          <section id="groups-list" class="unbordered import-list" data-type="list">';
MockImportHtml += '            <section id="group-#group#" data-template>';
MockImportHtml += '              <header>#letter#</header>';
MockImportHtml += '              <ol id="contacts-list-#group#">';
MockImportHtml += '                <li data-template data-uuid="#uid#" data-search="#search#" aria-disabled="false" class="block-item">';
MockImportHtml += '                  <label>';
MockImportHtml += '                    <input type="checkbox" name="#uid#"></input>';
MockImportHtml += '                   <span></span>';
MockImportHtml += '                  </label>';
MockImportHtml += '                  <aside class="pack-end">';
MockImportHtml += '                    <img data-src="https://graph.facebook.com/#uid#/picture?type=square"></img>';
MockImportHtml += '                  </aside>';
MockImportHtml += '                  <p><strong>#givenName#</strong> #familyName#</p>';
MockImportHtml += '                  <p>#email1#</p>';
MockImportHtml += '                </li>';
MockImportHtml += '              </ol>';
MockImportHtml += '            </section> <!-- group template content -->';
MockImportHtml += '          </section> <!-- groupsList -->';

MockImportHtml += '          <form role="dialog" data-type="confirm" class="no-overlay">';
MockImportHtml += '            <menu id="select-all-wrapper">';
MockImportHtml += '              <button id="deselect-all" class="edit-button" data-l10n-id="deselectAll">';
MockImportHtml += '                Deselect all';
MockImportHtml += '              </button>';
MockImportHtml += '              <button id="select-all" class="edit-button" data-l10n-id="selectAll">';
MockImportHtml += '                Select all';
MockImportHtml += '              </button>';
MockImportHtml += '            </menu>';
MockImportHtml += '          </form>';
MockImportHtml += '        </section> <!-- mainContent -->';
