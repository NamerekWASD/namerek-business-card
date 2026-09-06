import { pick } from './locale.js';

// Interface chrome, in the four languages NBC-85 promises — everything a
// visitor reads that is not "the card's own copy": `content.js` and
// `projects.js` own that half, because it is data with a shape of its own
// (a person, an archive) rather than isolated labels. This file is the other
// half, flat by key so a translation and its three siblings sit next to each
// other rather than three keys apart in three different locale blocks.
//
// A key holds a `{placeholder}` when the surrounding sentence needs a runtime
// value (a shot's own number, a project's own title) — `t()` below fills it
// with a plain `String.replace`, not a templating engine, because there is
// nothing here more complex than "insert this number".
export const STRINGS = {
  'dieselpunk.flatViewLink': {
    de: 'Flache Ansicht ↗', en: 'Flat view ↗', uk: 'Плоский вигляд ↗', ru: 'Плоский вид ↗',
  },
  'rail.title': { de: 'Aufzug', en: 'Elevator', uk: 'Ліфт', ru: 'Лифт' },
  'rail.aria': { de: 'Etagen', en: 'Floors', uk: 'Поверхи', ru: 'Этажи' },

  // `Erdgeschoss` is not translated — see the note in `lift/decks.js`: the
  // building's own floor numbering (EG/OG/UG) is signage, not interface, and
  // stays German in every locale the same way the console's works plate
  // does. Only the description after the dash is a visitor-facing fact.
  'floorStart.label': {
    de: 'Erdgeschoss — Eingang',
    en: 'Erdgeschoss — Entrance',
    uk: 'Erdgeschoss — Вхід',
    ru: 'Erdgeschoss — Вход',
  },

  'floorLeistungen.disclaimer': {
    de: 'Anzeigen dienen der Beschriftung — keine Bewertung, keine Prozentwerte.',
    en: 'The dials are labels, not a rating — there are no percentages behind them.',
    uk: 'Шкали — це лише підписи, а не оцінка: за ними немає відсотків.',
    ru: 'Шкалы — это лишь подписи, а не оценка: за ними нет процентов.',
  },

  'floorProjekte.screenshotAlt': {
    de: 'Bildschirmfoto: {title}', en: 'Screenshot: {title}', uk: 'Знімок екрана: {title}', ru: 'Снимок экрана: {title}',
  },
  'floorProjekte.viewFullscreenAria': {
    de: '{title} in Vollbild ansehen',
    en: 'View {title} in fullscreen',
    uk: 'Переглянути «{title}» на весь екран',
    ru: 'Просмотреть «{title}» на весь экран',
  },
  'floorProjekte.archiveEmptyAria': {
    de: 'Archiv leer', en: 'Archive empty', uk: 'Архів порожній', ru: 'Архив пуст',
  },
  'floorProjekte.prevAria': {
    de: 'Vorherige Aufnahme', en: 'Previous shot', uk: 'Попередній кадр', ru: 'Предыдущий кадр',
  },
  'floorProjekte.nextAria': {
    de: 'Nächste Aufnahme', en: 'Next shot', uk: 'Наступний кадр', ru: 'Следующий кадр',
  },
  'floorProjekte.prevLabel': { de: '‹ Zurück', en: '‹ Prev', uk: '‹ Назад', ru: '‹ Назад' },
  'floorProjekte.nextLabel': { de: 'Weiter ›', en: 'Next ›', uk: 'Далі ›', ru: 'Далее ›' },
  'floorProjekte.empty': {
    de: 'Kein Bestand', en: 'No stock', uk: 'Немає в наявності', ru: 'Нет в наличии',
  },
  'floorProjekte.shotOf': {
    de: 'Aufnahme {shot} von {shots}',
    en: 'Shot {shot} of {shots}',
    uk: 'Кадр {shot} з {shots}',
    ru: 'Кадр {shot} из {shots}',
  },
  'floorProjekte.viewSource': {
    de: 'Quelltext ansehen', en: 'View source', uk: 'Переглянути код', ru: 'Смотреть код',
  },

  'floorKontakt.formTitle': {
    de: 'Werks-Depeschenformular',
    en: 'Works Dispatch Form',
    uk: 'Заводський бланк депеші',
    ru: 'Заводской бланк депеши',
  },
  'floorKontakt.formSub': {
    de: 'Formblatt 3-B · Abteilung Versand',
    en: 'Form 3-B · Dispatch Dept.',
    uk: 'Бланк 3-Б · Відділ відправлення',
    ru: 'Бланк 3-Б · Отдел отправки',
  },
  'floorKontakt.stamp': { de: 'Angenommen', en: 'Accepted', uk: 'Прийнято', ru: 'Принято' },
  'floorKontakt.telex': { de: 'Fernschreiben', en: 'Telex', uk: 'Телеграма', ru: 'Телеграмма' },
  'floorKontakt.copy': {
    de: 'Adresse kopieren', en: 'Copy address', uk: 'Скопіювати адресу', ru: 'Скопировать адрес',
  },
  'floorKontakt.copied': {
    de: 'Gestempelt · Kopiert',
    en: 'Stamped · Copied',
    uk: 'Позначено · Скопійовано',
    ru: 'Отмечено · Скопировано',
  },
  'floorKontakt.directory': { de: 'Verzeichnis', en: 'Directory', uk: 'Каталог', ru: 'Каталог' },
  'floorKontakt.workshop': { de: 'Werkstatt', en: 'Workshop', uk: 'Майстерня', ru: 'Мастерская' },
  'floorKontakt.switchTo3d': {
    de: 'Zur 3D-Ansicht wechseln ↗',
    en: 'Switch to the 3D view ↗',
    uk: 'Перейти до 3D-версії ↗',
    ru: 'Перейти к 3D-версии ↗',
  },

  // `FullscreenImageModal.jsx` shipped English-only before NBC-85 touched it —
  // not German, unlike the rest of the card — so `de` below is a translation
  // like the other three, not the original this ticket is moving away from.
  'fullscreenModal.ariaLabel': {
    de: 'Bildvorschau im Vollbild', en: 'Fullscreen image preview', uk: 'Перегляд зображення на весь екран', ru: 'Просмотр изображения на весь экран',
  },
  'fullscreenModal.close': { de: 'Vorschau schließen', en: 'Close preview', uk: 'Закрити перегляд', ru: 'Закрыть просмотр' },
  'fullscreenModal.prevProject': {
    de: 'Vorheriges Projekt: {title}', en: 'Previous project: {title}', uk: 'Попередній проєкт: {title}', ru: 'Предыдущий проект: {title}',
  },
  'fullscreenModal.prevPhoto': { de: 'Vorheriges Foto', en: 'Previous photo', uk: 'Попереднє фото', ru: 'Предыдущее фото' },
  'fullscreenModal.nextProject': {
    de: 'Nächstes Projekt: {title}', en: 'Next project: {title}', uk: 'Наступний проєкт: {title}', ru: 'Следующий проект: {title}',
  },
  'fullscreenModal.nextPhoto': { de: 'Nächstes Foto', en: 'Next photo', uk: 'Наступне фото', ru: 'Следующее фото' },
};

/**
 * @param {keyof typeof STRINGS} key
 * @param {import('./locale.js').LocaleId} locale
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 */
export function t(key, locale, vars) {
  const template = pick(STRINGS[key], locale);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) => (
    name in vars ? String(vars[name]) : whole
  ));
}
