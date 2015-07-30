'use strict';

// we set the title from JS to prevent rocketbar picking up pretranslated
// title and switching to l10n one.
//
// With this approach the title is empty until l10n provides the correct
// translation
var title = document.head.getElementsByTagName('title')[0];
title.setAttribute('data-l10n-id', 'private-window');
