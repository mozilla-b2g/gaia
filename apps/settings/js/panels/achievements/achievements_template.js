/**
 * The template function for generating an UI element for an Addon item.
 *
 * @module achievements/achievements_template
 */
define(function(require) {
  'use strict';

  return function achievementsTemplate(achievement, recycled) {
    var container, span, small, icon, details;
    var name = achievement.criteria.split('achievements/')[1];

    if (recycled) {
      container = recycled;
      details = container.querySelector('span');
      span = details.querySelector('span');
      small = details.querySelector('small');
      icon = container.querySelector('img');
    } else {
      container = document.createElement('li');
      details = document.createElement('span');
      span = document.createElement('span');
      small = document.createElement('small');
      icon = document.createElement('img');

      container.classList.add('achievements-item');
      details.classList.add('details');
      details.setAttribute('role', 'presentation');
      small.classList.add('description');
      icon.classList.add('icon');
      icon.setAttribute('aria-hidden', true);

      container.appendChild(icon);
      details.appendChild(span);
      details.appendChild(small);
      container.appendChild(details);
    }

    icon.src = `../style/images/achievements/${name}.png`;

    span.setAttribute('data-l10n-id', `achievements-${name}-name`);
    small.setAttribute('data-l10n-id', `achievements-${name}-description`);

    if (achievement.evidence) {
      container.classList.add('rewarded');
      container.removeAttribute('aria-disabled');
    } else {
      container.classList.remove('rewarded');
      container.setAttribute('aria-disabled', true);
    }

    return container;
  };
});
