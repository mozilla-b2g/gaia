Evme.ShortcutsCustomize = new function Evme_ShortcutsCustomize() {
    var NAME = 'ShortcutsCustomize', self = this,
        elList = null, elParent = null,
        savedIcons = null;

    this.init = function init(options) {
        elParent = options.elParent;

        elList = Evme.$create('select', {'multiple': "multiple", 'id': "shortcuts-select"});
        elList.addEventListener('blur', onHide);

        elParent.appendChild(elList);

        Evme.EventHandler.trigger(NAME, 'init');
    };

    this.show = function show() {
        elList.focus();

        Evme.EventHandler.trigger(NAME, 'show');
    };

    this.hide = function hide() {
        window.focus();
        elList.blur();
    };

    this.get = function get() {
        var selectedShortcuts = [],
            elShourtcuts = Evme.$('option', elList);

        for (var i=0, elOption; elOption=elShourtcuts[i++];) {
            if (elOption.selected) {
                selectedShortcuts.push({
                    "query": elOption.value,
                    "experienceId": elOption.dataset.experience || ''
                });
            }
        }

        return selectedShortcuts;
    };

    this.load = function load(data) {
        savedIcons = data.icons;

        elList.innerHTML = '';
        self.add(data.shortcuts);

        Evme.EventHandler.trigger(NAME, 'load');
    };

    this.add = function add(shortcuts) {
        var html = '',
            shortcutsAdded = {};

        for (var i=0,shortcut,query,queryKey,experienceId,name; shortcut=shortcuts[i++];) {
            query = shortcut.query;
            queryKey = query.toLowerCase();
            experienceId = shortcut.experienceId || '';
            name = query;

            if (experienceId) {
                var l10nkey = 'id-' + Evme.Utils.shortcutIdToKey(experienceId),
                    translatedName = Evme.Utils.l10n('shortcut', l10nkey);

                if (translatedName) {
                    name = translatedName;
                }
            }

            name = name.replace(/</g, '&lt;');

            if (!shortcutsAdded[queryKey]) {
                html += '<option ' +
                            'value="' + query.replace(/"/g, '&quot;') + '" ' +
                            'data-experience="' + experienceId + '"' +
                        '>' + Evme.html(name) + '</option>';

                shortcutsAdded[queryKey] = true;
            }
        }

        elList.innerHTML = html;
    };

    this.Loading = new function Loading() {
        var active = false,
            ID = 'shortcuts-customize-loading';

        this.show = function loadingShow() {
            if (active) return;

            var el = Evme.$create('form',
                        {'id': ID, 'role': 'dialog', 'data-type': 'confirm'},
                        '<section>' +
                            '<h1 ' + Evme.Utils.l10nAttr(NAME, 'loading') + '></h1>' +
                            '<p class="building-block">' +
                                '<progress></progress>' +
                            '</p>' +
                        '</section>' +
                        '<menu>' +
                            '<button ' + Evme.Utils.l10nAttr(NAME, 'loading-cancel') + ' class="full"></button>' +
                        '</menu>');

            Evme.$("button", el, function onItem(elButton) {
                elButton.addEventListener("click", onLoadingCancel)
            });

            Evme.Utils.getContainer().appendChild(el);

            active = true;

            Evme.EventHandler.trigger(NAME, 'loadingShow');
        };

        this.hide = function loadingHide() {
            if (!active) return;

            Evme.$remove('#' + ID);
            active = false;

            Evme.EventHandler.trigger(NAME, 'loadingHide');
        };
    };

    function onHide() {
        Evme.EventHandler.trigger(NAME, 'hide');

        done();
    }

    function onLoadingCancel(e) {
        e.stopPropagation();
        Evme.EventHandler.trigger(NAME, 'loadingCancel', {
            'e': e
        });
    }

    function done() {
        Evme.EventHandler.trigger(NAME, 'done', {
            'shortcuts': self.get(),
            'icons': savedIcons
        });
    }
};