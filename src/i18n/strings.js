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
  // NBC-101: the same control, in the width a control rail has for it. The
  // full phrase above stays — it is the link's accessible name, where there is
  // no rail to fit into. Four keys on one line at 360px is what this buys.
  'floorProjekte.viewSourceShort': {
    de: 'Quelltext', en: 'Source', uk: 'Код', ru: 'Код',
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
  'floorKontakt.emailBtn': { de: 'E-Mail', en: 'Email', uk: 'Email', ru: 'Email' },
  'floorKontakt.linkedinBtn': { de: 'LinkedIn', en: 'LinkedIn', uk: 'LinkedIn', ru: 'LinkedIn' },
  'floorKontakt.githubBtn': { de: 'GitHub', en: 'GitHub', uk: 'GitHub', ru: 'GitHub' },
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

  // ── NBC-90: the text that is pixels ────────────────────────────────────────
  // Everything below is painted into a canvas and baked into a texture rather
  // than laid out by the browser, which changes two things and nothing else.
  //
  // It is stencilled, so it is upper case and it is short: these are labels cut
  // into a machine, and the boxes they sit in were drawn at the German width.
  // `fitFont` in `canvasText.js` takes a point off a line that overruns, but a
  // translation that needs three is the wrong translation.
  //
  // And it cannot be changed while anyone is looking at it — a repaint of half
  // a dozen textures is a hitch, so it happens behind shut doors. See
  // `i18n/SceneLocale.jsx`.
  //
  // What is *not* here is as deliberate as what is. `NAMEREK WERK` is the works'
  // own name and stays; so do the product names on the block diagram (`EF CORE`,
  // `MSSQL · MONGODB`), the towns on the map, the Rhine, and every line of the
  // ground floor's build log below its heading — that is a compiler talking,
  // and a compiler talks in English wherever it is installed. The 1937 valve
  // schematic on the 2. OG wall keeps its German whole (`STÜCKLISTE`, `EING.`,
  // `AUSG.`), for the reason NBC-85 wrote the prop rule down: it is a drawing
  // hanging on a wall, dated, titled and numbered in German, and translating
  // three words on it would leave a half-German drawing rather than a
  // translated one.

  'screen.terminal.head': {
    de: 'NAMEREK WERK · BAUSTAND',
    en: 'NAMEREK WERK · BUILD STATUS',
    uk: 'NAMEREK WERK · СТАН ЗБІРКИ',
    ru: 'NAMEREK WERK · СТАТУС СБОРКИ',
  },

  'screen.flow.head': {
    de: 'NAMEREK WERK · ANFRAGEWEG',
    en: 'NAMEREK WERK · REQUEST PATH',
    uk: 'NAMEREK WERK · ШЛЯХ ЗАПИТУ',
    ru: 'NAMEREK WERK · ПУТЬ ЗАПРОСА',
  },
  'screen.flow.request': { de: 'ANFRAGE', en: 'REQUEST', uk: 'ЗАПИТ', ru: 'ЗАПРОС' },
  'screen.flow.response': { de: 'ANTWORT', en: 'RESPONSE', uk: 'ВІДПОВІДЬ', ru: 'ОТВЕТ' },
  'screen.flow.database': {
    de: 'DATENBANK', en: 'DATABASE', uk: 'БАЗА ДАНИХ', ru: 'БАЗА ДАННЫХ',
  },
  'screen.flow.endpoint': {
    de: 'REST · ENDPUNKT', en: 'REST · ENDPOINT', uk: 'REST · ВХІД', ru: 'REST · ВХОД',
  },
  'screen.flow.rules': {
    de: 'DDD · REGELN', en: 'DDD · RULES', uk: 'DDD · ПРАВИЛА', ru: 'DDD · ПРАВИЛА',
  },

  'screen.map.head': {
    de: 'NAMEREK WERK · STANDORT',
    en: 'NAMEREK WERK · LOCATION',
    uk: 'NAMEREK WERK · РОЗТАШУВАННЯ',
    ru: 'NAMEREK WERK · РАСПОЛОЖЕНИЕ',
  },
  'screen.map.available': {
    de: 'VERFÜGBAR AB SOFORT',
    en: 'AVAILABLE IMMEDIATELY',
    uk: 'ДОСТУПНИЙ ВІДРАЗУ',
    ru: 'ДОСТУПЕН СРАЗУ',
  },

  'screen.archive.head': {
    de: 'NAMEREK · ARCHIV', en: 'NAMEREK · ARCHIVE', uk: 'NAMEREK · АРХІВ', ru: 'NAMEREK · АРХИВ',
  },
  'screen.archive.empty': {
    de: 'KEIN EINTRAG', en: 'NO ENTRY', uk: 'ЗАПИСІВ НЕМАЄ', ru: 'ЗАПИСЕЙ НЕТ',
  },
  'screen.archive.missing': {
    de: 'BILD FEHLT', en: 'IMAGE MISSING', uk: 'НЕМАЄ ЗОБРАЖЕННЯ', ru: 'НЕТ ИЗОБРАЖЕНИЯ',
  },
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
