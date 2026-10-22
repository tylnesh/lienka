// SPDX-FileCopyrightText: 2026 Michal Kohutek
// SPDX-License-Identifier: GPL-3.0-only

/* baby-log PWA — views: today / log / stats / insights, entry editing in a modal sheet. */

const API = { meta: "/api/meta", settings: "/api/settings", entries: "/api/entries", summary: "/api/summary", tasks: "/api/tasks", taskCheckins: "/api/task_checkins", llm: "/api/llm", llmScale: "/api/llm/scale" };

const I18N = {
  sk: {
    title: "Denník miminka",
    users: { others: "Ostatní" },
    setup: { title: "Nastavte Lienku", sub: "Kto sa o bábätko stará a kedy sa narodilo? Dá sa to kedykoľvek upraviť v Nastaveniach.", users: "Ošetrovatelia", addName: "Meno (napr. Mamička)", add: "Pridať človeka", remove: "Odstrániť", birth: "Dátum narodenia", birthSub: "Zostáva na vašom serveri — vek a rastové grafy sa sprístupnia po nastavení.", save: "Uložiť nastavenie", saved: "Nastavenie uložené", needUser: "Zadajte aspoň jedno meno.", badRejected: "Server odmietol hodnoty", failed: "Nepodarilo sa uložiť — ste online?", renameNote: "Premenovanie prepíše aj staršie záznamy.", removedNote: "Po odstránení zostanú staré záznamy s pôvodným menom.", },
    kinds: { diaper: "Plenka", feed: "Kojenie", sleep: "Spánok", walk: "Prechádzka", bath: "Kúpeľ", medication: "Lieky", activity: "Aktivita", task: "Úloha", measure: "Meranie", note: "Poznámka" },
    kind_sub: {
      diaper: "mokrá · stolica", feed: "časovač · ml", sleep: "spí / vstal", walk: "čas vonku",
      bath: "kúpanie", medication: "liek · dávka", activity: "poradna · hra", task: "pripomienka", measure: "váha · teplota", note: "text",
    },
    diaper_types: { wet: "Mokrá", dirty: "Stolica", mixed: "Zmiešaná" },
    diaper_colours: { mustard: "Musťardová", yellow: "Žltá", green: "Zelená", brown: "Hnedá", black: "Čierna (mekónium)", red: "Červená", other: "Iná" },
    feed_methods: { breast_left: "Ľavý prs", breast_right: "Pravý prs", bottle_expressed: "Fľaša – odstriekané", bottle_formula: "Fľaša – umelé", pump: "Odsávanie" },
    quick_feed_methods: { breast_left: "Ľavý prs", breast_right: "Pravý prs", bottle_expressed: "fľaša", bottle_formula: "umelé", pump: "odsávanie" },
    measure_kinds: { weight_g: "Hmotnosť (g)", temp_c: "Teplota (°C)", vitd_iu: "Vitamín D (IU)" },
    fields: {
      user: "Kto zaznamenal", at: "Čas", diaper_type: "Typ", diaper_colour: "Farba stolice", feed_method: "Spôsob",
      feed_minutes: "Minúty", feed_ml: "ml", swallows: "Počuté prehlt-y", end_at: "Koniec",
      date: "Dátum", time: "Čas",
      measure_kind: "Čo meriame", value: "Hodnota", med_name: "Liek", dose: "Dávka", activity: "Aktivita", note: "Poznámka",
    },
    hints: {
      milk: "Odhad: ~{lo}–{hi} ml na krmenie",
      milkDay: "~{dlo}–{dhi} ml/deň pri ~{f} kŕmeniach",
      infoAge: "Orientačné množstvo pre vek – v 1. týždni podľa objemu žalúdka, potom typické dávky. Nie je to cieľ: pri kojení sa riaďte signálmi dieťaťa (zdroje S119–S121 v registri).",
      infoWeight: "Výpočet z poslednej hmotnosti ({w} kg): 150–180 ml/kg/deň ÷ ~{f} kŕmení/deň. Odhad nie je cieľ – pri kojení sa riaďte dieťaťom; v rastových spurtoch (3./6. týždeň, 3./6. mesiac) je dočasne vyšší príjem normálny. Zdroje: Voedingscentrum NL + CZ ped. prax (S119/S120).",
    },
    scale: {
      title: "Dávka z váh (fotky)", titleManual: "Váženie pred/po (kg)",
      before: "Pred kŕmením", after: "Po kŕmení",
      take: "Odfotiť", upload: "Nahrať",
      kg: "kg", auto: "prečítané z displeja", manual: "neprečítané – zadajte hodnotu ručne",
      aiWait: "AI číta fotku…", autoAi: "prečítané z fotky (AI)",
      fromStash: "predtým nameraná hodnota", badKg: "Zadaj platnú hmotnosť – kg (6,24) alebo gramy (6240)",
      delta: "Vypila: +{g} g (~{ml} ml)", bad: "Rozdiel {g} g nedáva zmysel – skontrolujte hodnoty.",
      offer: "Chcete doplniť fotky z váh?", offerBtn: "Doplniť váhy",
      photosFail: "Záznam uložený, fotky sa nepodarilo nahrať.",
    },
    save: "Uložiť", cancel: "Zrušiť", delete: "Vymazať", edit: "Upraviť", none: "—", now: "teraz",
    confirmDelete: "Vymazať?", confirmDelete2: "Naozaj vymazať",
    startSleep: "Spustiť spánok", stopSleep: "Ukončiť spánok", stopFeed: "Ukončiť kŕmenie",
    sleepRunning: "Spánok beží", feedRunning: "Kojenie beží", since: "od",
    startWalk: "Spustiť prechádzku", stopWalk: "Ukončiť prechádzku", walkRunning: "Prechádzka beží",
    startBath: "Spustiť kúpeľ", stopBath: "Ukončiť kúpeľ", bathRunning: "Kúpeľ beží",
    startActivity: "Spustiť aktivitu", stopActivity: "Ukončiť aktivitu", activityRunning: "Aktivita beží",
    pause: "Pauza", resume: "Pokračovať", pausedTag: "po pauze", pausedMin: "pauza {n} min",
    actTimerOn: "{name} beží – zastavíš ju v paneli vyššie",
    refreshed: "Aktualizované",
    running: "beží", stop: "Zastaviť",
    today: "Dnes", yesterday: "Včera", week: "7 dní", days14: "14 dní", days30: "30 dní", day: "Deň",
    summaryTitle: "Dnes", entriesTitle: "Záznamy", statsTitle: "Grafy", insightsTitle: "Tipy a trendy", tableTitle: "Denný prehľad",
    stat: { nappies: "Plienky", feeds: "Kŕmenia", sleep: "Spánok", care: "Starostlivosť", weight: "Hmotnosť", notes: "Poznámky", ml: "Odstriekané" },
    table: { date: "Deň", wet: "Mokré", dirty: "Stolice", feeds: "Kŕmenia", sleep: "Spánok (h)", weight: "Hmotnosť" },
    chart: { output: "Odpady", feeds: "Kŕmenia", sleep: "Spánok", weight: "Hmotnosť", care: "Starostlivosť" },
    noData: "Zatiaľ málo údajov.", empty: "Zatiaľ žiadne záznamy.", loadMore: "Načítať staršie",
    offline: "Uložené offline – skúsime znova, keď bude sieť.",
    ageOne: "deň", ageFew: "dni", ageMany: "dní", ageLabel: "Vek",
    saved: "Uložené", undo: "Späť", retry: "Skúsiť znova", language: "EN",
    filters: { all: "Všetko", kind: "Typ", user: "Kto" },
    lastEvents: "Posledné záznamy", quickTitle: "Rýchlo zaznamenať", fastTitle: "Plienka na jeden klik", qkTemp: "teplota",
    addTitle: "Pridať záznam", timersTitle: "Časovače",
    nextFeed: "Posledné kŕmenie", nextFeedAgo: "pred", nextFeedDue: "čas na kŕmenie", nextFeedIn: "o",
    notices: { title: "Dôležité upozornenia", more: "Detaily v Tipy", review: "Skontrolovať", openSource: "Zobraziť zdroj", dayNoEntries: "žiadne záznamy tento deň" },
    kontrola: {
      title: "Kontrola záznamov", range: "Obdobie", empty: "Žiadne sporné záznamy – všetko sedí.",
      saved: "Uložené", proposed: "Navrhované", sevBad: "chyba", sevWarn: "pozor", sevInfo: "info",
      fix: "Opraviť", manual: "Upraviť ručne", keep: "Ponechať", endNow: "Ukončiť teraz", cancelEntry: "Zrušiť záznam",
      clearEnd: "Zmazať koncový čas", swap: "Prehodiť začiatok a koniec", delSecond: "Vymazať druhý",
      addFeed: "Pridať kŕmenie", addEntry: "Pridať záznam", context: "Kontext dňa", fixed: "Opravené",
      noAuto: "Bez automatického návrhu – skontroluj záznam.", duration: "Trvanie", end: "Koniec", at: "Začiatok", value: "Hodnota",
    },
    tasks: {
      title: "Pripomienky", manage: "Spravovať", add: "Pridať pripomienku", none: "Zatiaľ žiadne pripomienky.",
      done: "Hotovo", skip: "Preskočiť", undo: "Späť", overdue: "mešká", today: "dnes",
      editTitle: "Pripomienka", newTitle: "Nová pripomienka", name: "Názov", detail: "Detail",
      icon: "Ikona", color: "Farba", repeat: "Opakovanie", daily: "Denne", weekly: "Týždenne", monthly: "Mesačne",
      days: "Dni", timesPerDay: "Krát za deň", interval: "Medzera (min)", startTime: "Začiatok", duration: "Trvanie (min)",
      startDate: "Od", endDate: "Do", active: "Aktívna", inactive: "Neaktívna", preview: "Časy",
      calendar: "Kalendár", calendarSub: "Odoberateľný .ics pre iOS/Ubuntu", saved: "Pripomienka uložená", deleted: "Pripomienka vymazaná",
      weekdays: { 0: "Po", 1: "Ut", 2: "St", 3: "Št", 4: "Pi", 5: "So", 6: "Ne" },
    },
    nav: { today: "Dnes", log: "Záznamy", stats: "Grafy", kontrola: "Kontrola", insights: "Tipy", doctor: "Lekár" },
    doctor: {
      title: "Lekár / pediatr",
      intro: "Zoznam na konzultáciu s pediatrom – nie je to lekárske odporúčanie. Generované z vašich záznamov a z reportu watch-outs (reports/2026-10-12).",
      questionsTitle: "Otázky z vašich dát", questionsNone: "Z aktuálnych záznamov nie sú otázky – nič nepravidelné.",
      checklistTitle: "Kontrolný zoznam (vekové okná)",
      copy: "Kopírovať otázky", copied: "Skopírované do schránky",
      srcNote: "Položky s [overiť] majú zdroj v sources/SOURCES.md, na SK podmienky sa ešte overujú.",
      qTemp: "Teplota {t} °C ({d}) – do 3 mesiacov pri teplote ≥ 38 °C kontaktovať lekára. Potvrdiť postup.",
      qWeightLow: "Prírastok {per} g/deň je pod 5. percentilom WHO – skontrolovať kojenie/kojenie a váhu.",
      qWeightWatch: "Prírastok {per} g/deň je medzi 5. a 10. percentilom WHO – sledujeme, poradiť.",
      qRegain: "Vo veku {age} dní je váha {last} g stále pod počiatočnou {first} g – poradiť sa.",
      qWet: "Priemer {n} mokrých plienok/deň (od 5. dňa sa uvádza aspoň 6) – skontrolovať príjem.",
      qStool: "Priemer {n} stolíc/deň (od 4. dňa sa uvádza aspoň 2) – skontrolovať príjem.",
      qFeedLow: "Priemer {n} kŕmení/deň (spravidla aspoň 8 – 12 a viac) – posúdiť kojenie.",
      qGap: "Najdlhšia pauza {n} min ({d}) – dohodnúť, či budiť na kŕmenie a dokedy.",
      qColour: "{colour} stolica ({d}) – overiť, či nie je varovaním.",
      qMl: "Kŕmenie {ml} ml ({d}) – overiť množstvo vo veku {age} dní.",
      qVitaminD: "Dávame vitamin D {iu} IU/deň – porovnať s odporúčaniami (ESPGHAN/EAP 400 IU; SK prax 600 – 800 IU od 2. týždňa), dĺžku potvrdiť u lekára.",
      qWeightCadence: "Vážime {n}× týždenne – potvrdiť, ako často vážiť a či merať aj u lekára.",
      qScreening: "Novorodenecké skríningy (odber z päty, sluch, US bedier) – potvrdiť rozsah a termíny ([overiť]).",
      qHip: "Kontrola bedier – kedy na ultrazvuk a či je potrebná ([overiť]).",
      qFeeding: "Kŕmenie: {n} kŕmení/deň, priemer {ml} ml, pauzy {avg} min – je príjem primeraný?",
      qSleep: "Spánok {h} h/deň, najdlhší úsek {max} min – je to v tomto veku bežné?",
      qParents: "Mama: spánkový dlh, nálada; otec: aj otcovská popôrodná depresia – kam s ňou ([overiť]).",
      clNewborn: "Novorodenecké kontroly – váha, žltačka, pupok; termín prvej kontroly ([overiť]).",
      clScreening: "Skríning: odber z päty (NÚDŠ) a sluchový skríning – potvrdenie výsledkov ([overiť]).",
      clHip: "US bedier cca 6 – 12 týždňov – objednať včas ([overiť]).",
      clVitaminD: "Vitamin D: ESPGHAN/EAP 400 IU/deň; SK prax 600 – 800 IU/deň od 2. týždňa – potvrdiť dávku u lekára.",
      clVaccines: "Očkovanie podľa kalendára ÚVZ SR – prvá dávka hep B do 24 h ([overiť]).",
      cl6w: "Kontrola 6 – 8 týždňov: váha, vývoj, bedrá, očkovanie 1. dávky.",
      cl3m: "Kontrola ~3 mesiace: očkovanie 2. dávky, vývoj; pri teplote ≥ 38 °C ihneď k lekárovi.",
      clSolids: "~6 mesiacov: spustiť tuhé potraviny, alergény podľa rozhodnutia (pozri rozhodnutie 2026-10-09).",
    },
    settings: {
      title: "Nastavenia", language: "Jazyk", theme: "Téma", themeAuto: "Auto", themeDark: "Tmavá", themeLight: "Svetlá",
      anim: "Animácie", animSub: "Jemné prechody pri prepínaní a odozvách", animAuto: "Auto", animOn: "Zapnuté", animOff: "Vypnuté",
      scale: "Meranie z váh", scaleSub: "Fotku displeja váh odfotíš alebo nahráš z galérie. Hodnoty pred/po kŕmení vieme aj bez fotky – stačí zadať kg a mlieko sa dopočíta samo.", scalePhoto: "Foto + ručne", scaleManual: "Len ručne", scaleOff: "Vypnuté",
      sources: "Zdroje odporúčaní", sourcesSub: "Klikni, ktoré zdroje sa môžu citovať v Tipoch. Hranice hodnôt zostávajú najkonzervatívnejšie bez ohľadu na výber.", sourcesAll: "Zapnúť všetko",
      qkTitle: "Rýchle záznamy", qkSub: "Uprav dlaždice, skupiny a medzery na karte Dnes; pridaj aj liek či aktivitu na jeden klik.", qkEdit: "Usporiadať", qkAddSub: "Pridať dlaždicu na jeden klik", qkMedPh: "názov lieku", qkActPh: "názov aktivity", qkDosePh: "dávka (voliteľné)", qkAdd: "Pridať", qkDel: "Odstrániť", qkUp: "Posunúť hore", qkDown: "Posunúť dole", qkTypeMed: "liek", qkTypeAct: "aktivita",
      qkPausable: "Pauzovatelná (spustí živý časovač)", qkGroups: "Skupiny a medzery",
      qkGroupsSub: "Nadpis zhrúbia dlaždice do sekcie, medzera pridá prázdne políčko v mriežke.",
      qkGroupPh: "názov skupiny (napr. Večer)", qkGroupAdd: "Pridať skupinu", qkGapAdd: "Pridať medzeru", qkGap: "Prázdne miesto",
      gridTitle: "Poradie na karte Dnes", gridSub: "Zaškrtni, ktoré dlaždice sa zobrazujú. Poradie meníš ťahaním za úchytku; na klávesnici úchytku zameraj a stlač ↑ alebo ↓.", qkDrag: "Uchytiť a presunúť",
      llm: "AI asistent", llmSub: "Voliteľné. OpenAI, Anthropic alebo akékoľvek OpenAI-kompatibilné API – napr. lokálny Ollama snap.", llmOff: "Vypnutý", llmCustom: "Vlastné URL", llmModelPh: "alebo zadaj názov modelu ručne", llmKeyKeep: "•••••••• (prázdne = nezmeniť)", llmKeyPh: "API kľúč", llmTest: "Test", llmTesting: "Testujem…", llmTestOk: "✓ Odpoveď:", llmTestFail: "✗ Test zlyhal:", llmDetect: "Nájsť lokálny Ollama", llmDetected: "Nájdených modelov: {n} – vyber v menu Model", llmNone: "Lokálny Ollama nenájdený", llmSaveFail: "Uloženie zlyhalo", llmNote: "Kľúč ostáva na serveri (súbor 0600). Tipy sú aj naďalej deterministické – AI sa volá len po nastavení.",
      llmSetup: "AI endpoint", llmSteps: "Zadaj adresu a stlač Test – overíme, že endpoint odpovedá, a stiahneme zoznam modelov do menu.", llmPick: "– najprv otestuj adresu –", llmModelsOk: "✓ {n} modelov načítaných z endpointu", llmNoModels: "Endpoint odpovedá, ale nevrátil žiadne modely – názov zapíš ručne.",
      remind: "Pripomienka kŕmenia", remindSub: "Upozorní, keď je kŕmenie dlho bez záznamu",
      trends: "Trendy", trendsSub: "Automaticky vynechá nepresné dni z trendov (napr. prvý deň sme začali večer).",
      trendAuto: "Auto", trendAll: "Všetky",
      remindEvery: "Interval (min)", test: "Skúsiť upozornenie", export: "Export CSV", cert: "Certifikát CA",
      ignored: "Ignorované a potvrdené", ignoredSub: "skryté alebo potvrdené z Dnes a Tipy", ignoredOpen: "Zobraziť",
      queue: "Fronta offline", queueEmpty: "prázdna", version: "Verzia", noNotif: "Pre upozornenia nainštalujte appku (PWA)",
    },
    insights: {
      weightTitle: "Prírastok hmotnosti", weightBig: "{per} g/deň",
      weightBand: "WHO GVS: v tomto veku medián +{med} g za {per} dní (10. percentil {p10} g)",
      weightOk: "Prírastok je nad 10. percentilom WHO normy rýchlosti rastu.",
      weightWatch: "Prírastok medzi 5. a 10. percentilom – sledujte a konzultujte s pediatrom.",
      weightLow: "Prírastok pod 5. percentilom WHO – kontaktujte pediatra.",
      weightFew: "Zatiaľ málo meraní na výpočet trendu.",
      regainTitle: "Hmotnosť voči počiatočnej", regainOk: "Posledná váha {last} g je nad počiatočnou {first} g.",
      regainWarn: "Vo veku {age} dní je váha {last} g stále pod počiatočnou {first} g. Väčšina detí je na pôrodnej hmotnosti do 3 týždňov.",
      feedTitle: "Kŕmenia za deň", feedBig: "{n}/deň",
      feedOk: "Dojčí sa na požiadanie bez obmedzenia frekvencie; prvých pár týždňov to zvyčajne znamená aspoň 8 – 12 kŕmení za 24 h.",
      feedLow: "Pod 8 kŕmeniami/24 h – častejšie ponúkaj na požiadanie; nechajte skontrolovať kojenie.",
      feedHigh: "Nad 12/24 h – v prvých týždňoch často normálne, sledujte váhu a plenky.",
      intervalBig: "stredná pauza {n} min", interval: "Najdlhšia pauza {max} min.",
      gapTitle: "Najdlhšia pauza medzi kŕmeniami", gapBig: "{n} min",
      gapSub: "Prvých pár dní kŕmenie spravidla po 1 – 3 h. Pauza {t} je dlhšia – v prvých týždňoch je vhodné budiť na kŕmenie.",
      sleepTitle: "Spánok za deň", sleepBig: "{h} h/deň",
      sleepNoRef: "Popisný údaj z vašich záznamov; overené referenčné rozmedzie sme v SK/EU zdrojoch nenašli [unsourced] – pri pochybnostiach pediatr.",
      diaperTitle: "Mokré plenky", diaperBig: "{n}/deň",
      diaperOk: "Od 5. dňa aspoň 6 ťažkých mokrých plienok za 24 h.",
      diaperLow: "Menej ako 6 mokrých plienok za 24 h (od 5. dňa) – kontaktujte pediatra.",
      stoolTitle: "Stolice za deň", stoolBig: "{n}/deň",
      stoolOk: "Od 4. dňa aspoň 2 mäkké žlté stolice denne.",
      stoolLow: "Menej ako 2 stolice denne (od 4. dňa) – skontrolujte kojenie, kontaktujte pediatra.",
      feverTitle: "Teplota ≥ 38 °C", feverBig: "{t} °C",
      feverSub: "Do 3 mesiacov veku teplota ≥ 38 °C = kontaktovať lekára ihneď [unsourced – over s pediatrom]. {d}",
      trendTitle: "Trend posledných 3 dní", trendFeeds: "Kŕmenia {d}", trendSleep: "Spánok {d} h", trendOutput: "Odpady {d}",
      trendFlat: "Oproti predchádzajúcim dňom bez výraznej zmeny.",
      longestTitle: "Najdlhší spánok v kuse", longestBig: "{n} min",
      longestSub: "Najdlhší súvislý spánok za obdobie. {note}",
      longestNoteNight: "Nočný úsek {t} – dlhší nočný spánok je v poriadku, ak sa budí na kŕmenie.",
      qualityTitle: "Kvalita záznamov", qualityBig: "{d} dní",
      qualitySub: "Chýba váha: {w} dní · chýba záznam v sieti: {n}",
      partialTitle: "Dnes (čiastočne)", partialBig: "{wet} mokré · {stool} stolice · {feeds} kŕmenia",
      partialSub: "Deň ešte neskončil; prahové varovania počítame len z dokončených dní.",
      completedDays: "Z dokončených dní: {n}.",
      excludedTitle: "Vynechané dni z trendu", excludedBig: "{n}",
      excludedSub: "{days} – automaticky vynechané, pretože deň pôjde o neúplný záznam (napr. začiatok neskoro alebo málo záznamov).",
      signalsTitle: "Signály a outlier kontroly", signalsBig: "{n}", signalsNone: "Žiadne podozrivé signály v období.", signalsMore: "+{n} ďalších",
      sigFutureTitle: "Budúci čas", sigFutureText: "{kind} {at} je viac ako 30 min v budúcnosti – skontrolujte dátum/čas zariadenia alebo výber času.",
      sigEndBeforeTitle: "Koniec pred začiatkom", sigEndBeforeText: "{kind} {at} → {end} – nedáva zmysel, skontroluj záznam.",
      sigLongSleepTitle: "Veľmi dlhý spánok", sigLongSleepText: "{n} min spánok ({at}) – možno nezastavený timer alebo chýbajúce prebúdzanie.",
      sigLongFeedTitle: "Veľmi dlhé kŕmenie", sigLongFeedText: "{n} min kŕmenie ({at}) – možno omyl alebo nezastavený timer.",
      sigLongTimerTitle: "Dlhý otvorený timer", sigLongTimerText: "{kind} beží {n} min bez konca – pravdepodobne sme zabudli zastaviť.",
      sigDuplicateTitle: "Duplikát", sigDuplicateText: "Dva {kind} záznamy takmer v rovnakom čase ({at}) – možno dvojklep.",
      sigMissingDayTitle: "Chýbajúci deň", sigMissingDayText: "{date} nemá takmer žiadne záznamy – medzera v logovaní.",
      sigPartialDayTitle: "Nepresný deň", sigPartialDayText: "{date} začína o {time} a má málo záznamov – vynechaný z trendu.",
      sigSleepOverlapTitle: "Prekrývajúci sa spánok", sigSleepOverlapText: "Spánok {a} a {b} sa prekrýva – možno začatý nový bez zastavenia starého.",
      sigSleepHighTitle: "Veľa spánku", sigSleepHighText: "{date}: {h} h spánku – možno choroba alebo chýbajúce záznamy.",
      sigSleepLowTitle: "Málo spánku", sigSleepLowText: "{date}: {h} h spánku – možno chýbajúce záznamy.",
      sigFeedGapTitle: "Dlhá pauza", sigFeedGapText: "Pauza {n} min medzi kŕmeniami ({at}) – možno dlhý spánok alebo zabudnuté kŕmenie.",
      sigFeedClusterTitle: "Veľa kŕmení", sigFeedClusterText: "{date}: {n} kŕmení – cluster feeding alebo duplicitné záznamy.",
      sigNoWetTitle: "Žiadna mokrá plenka", sigNoWetText: "Od {last} nebola zaznamenaná mokrá plenka – pri dehydratácii alebo chýbajúcom logovaní.",
      sigStoolColourTitle: "Farba stolice", sigStoolColourText: "{colour} stolica {at} – čierna po 3. dni alebo červená môžu byť varovanie.",
      sigTempHighTitle: "Teplota", sigTempHighText: "{t} °C {at} – do 3 mesiacov pri 38 °C kontaktovať lekára.",
      sigTempLowTitle: "Nízka teplota", sigTempLowText: "{t} °C {at} – skontroluj meranie a dieťa.",
      sigWeightJumpTitle: "Skok v hmotnosti", sigWeightJumpText: "{from} → {to} g ({per} g/deň) – možno preklep.",
      sigWeightDropTitle: "Pokles hmotnosti", sigWeightDropText: "{from} → {to} g – pokles {pct}%; skontroluj váhu a príjem.",
      sigWeightRangeTitle: "Váha mimo rozsahu", sigWeightRangeText: "{g} g je mimo novorodeneckého rozsahu – skontroluj jednotku.",
      sigMlHighTitle: "Veľa ml", sigMlHighText: "{ml} ml pri kŕmení {at} – možno preklep alebo veľká dávka.",
      sigWetLowTitle: "Mokré plenky", sigWetLowText: "Priemer dokončených dní je {n}/deň od 5. dňa – minimum je 6.",
      sigStoolLowTitle: "Stolice", sigStoolLowText: "Priemer dokončených dní je {n}/deň od 4. dňa – minimum sú 2.",
      sigWeightLowTitle: "Prírastok hmotnosti", sigWeightLowText: "{per} g/deň je pod 5. percentilom WHO – kontaktujte pediatra.",
      sigWeightWatchTitle: "Prírastok hmotnosti", sigWeightWatchText: "{per} g/deň je medzi 5. a 10. percentilom WHO – sledujte.",
      dismiss: "Ignorovať", undoDismiss: "Obnoviť",       dismissedToast: "Skryté z prehľadu",
      ignoredBtn: "Ignorované ({n})", ignoredTitle: "Ignorované upozornenia",
      ignoredSub: "Skryté z hlavného prehľadu (Dnes aj Tipy). Obnovenie ich vráti späť.",
      ignoredNone: "Nič nie je ignorované.", ignoredRestoreAll: "Obnoviť všetko", ignoredAt: "ignorované {at}",
      ignoredNote: "Pri vážnom varovaní zvaž obnovenie a konzultáciu s pediatrom – ignorovanie nemení to, čo ukazujú dáta.",
      ack: "Potvrdiť", ackTitle: "Potvrdiť upozornenie",
      ackReason: "Prečo je to v poriadku (nepovinné)", ackReasonPh: "napr. spala 5 h v kuse – vedome sme ju nebudili",
      ackScope: "Platí pre", ackOnce: "Len tento výskyt", ackRule: "Podobné signály",
      ackDur: "Pravidlo vyprší", ack7: "za 7 dní", ack30: "za 30 dní", ackForever: "nevyprší",
      ackCapNote: "Potlačené budú podobné signály do hodnoty {n}; väčšie opäť uvidíš.",
      ackBadNote: "Pozor: toto je vážne upozornenie. Potvrdenie ho skryje z prehľadu, ale dáta sa nezmenia.",
      ackSaved: "Potvrdené", undoAck: "Obnoviť",
      mgrBtn: "Ignorované a potvrdené ({n})", mgrTitle: "Ignorované a potvrdené",
      mgrSub: "Skryté z Dnes a Tipy. Potvrdenie môže obsahovať dôvod a pravidlo, ktoré tlmi podobné signály tohto typu.",
      ackKindHide: "ignorované", ackKindAck: "potvrdené", ackRuleLabel: "pravidlo – potláča podobné signály",
      ackUntil: "do {until}", ackUntilForever: "nevyprší", ackMaxUpTo: "max {n}",
      mgrNone: "Nič nie je ignorované ani potvrdené.", mgrAt: "uložené {at}",
      ackCapAll: "Pravidlo tlmi všetky budúce signály tohto typu; ostatné typy sa nezmenia.",
      moreSignals: "+{n} ďalších", fewerSignals: "Menej", noSignals: "Žiadne neignorované signály.",
      srcIntro: "Zdroje – otvoria sa v novej karte:",
      tagMeasured: "vypočítané z vašich záznamov",
      srcWho: "WHO GVS (rýchlosť rastu)", srcNhs: "NHS", srcNhs23: "NHS (váha)", srcAbm: "ABM #3", srcAwmf: "AWMF S3", srcAepap: "AEPap", srcAap: "AAP", srcPtgh: "PTGHiŻDz", srcMzsrf: "MZ SR (BFHI)", srcUnsourced: "[unsourced]", srcOff: "zdroje vypnuté",
      disclaimer: "Referenčné hodnoty vychádzajú z registrovaných zdrojov (MZ SR, WHO, NHS, AAP, ABM, AWMF, PTGHiŻDz) – podrobnosti a zapínanie v Nastaveniach → Zdroje. Tipy počítame deterministicky z vašich záznamov, bez AI. Nie je to lekárske odporúčanie – pri odchýlkach kontaktujte pediatra.",
    },
    errors: {
      bad_value: "neplatná hodnota", bad_number: "neplatné číslo", out_of_range: "mimo rozsahu",
      bad_datetime: "neplatný čas", required: "povinné", before_start: "koniec je pred začiatkom",
      nothing_to_update: "nič na zmenu", bad_json: "neplatný vstup", empty_body: "prázdny vstup",
      too_large: "príliš dlhý text", network: "server nedostupný", request_failed: "požiadavka zlyhala",
    },
  },
  en: {
    title: "Baby log",
    users: { others: "Others" },
    setup: { title: "Set up Lienka", sub: "Who cares for the baby, and when was the baby born? You can change this any time in Settings.", users: "Caregivers", addName: "Name (e.g. Mama)", add: "Add person", remove: "Remove", birth: "Birth date", birthSub: "Stays on your server — age and growth charts unlock once set.", save: "Save setup", saved: "Setup saved", needUser: "Enter at least one name.", badRejected: "Server rejected the values", failed: "Could not save — are you online?", renameNote: "Renaming relabels past entries too.", removedNote: "Removing someone keeps their existing entries under the old label.", },
    kinds: { diaper: "Diaper", feed: "Feed", sleep: "Sleep", walk: "Walk", bath: "Bath", medication: "Medication", activity: "Activity", task: "Task", measure: "Measure", note: "Note" },
    kind_sub: {
      diaper: "wet · dirty", feed: "timer · ml", sleep: "asleep / awake", walk: "outdoors",
      bath: "bath time", medication: "drug · dose", activity: "clinic · play", task: "reminder", measure: "weight · temp", note: "text",
    },
    diaper_types: { wet: "Wet", dirty: "Dirty", mixed: "Mixed" },
    diaper_colours: { mustard: "Mustard", yellow: "Yellow", green: "Green", brown: "Brown", black: "Black (meconium)", red: "Red", other: "Other" },
    feed_methods: { breast_left: "Left breast", breast_right: "Right breast", bottle_expressed: "Bottle – expressed", bottle_formula: "Bottle – formula", pump: "Pumping" },
    quick_feed_methods: { breast_left: "Left breast", breast_right: "Right breast", bottle_expressed: "bottle", bottle_formula: "formula", pump: "pump" },
    measure_kinds: { weight_g: "Weight (g)", temp_c: "Temperature (°C)", vitd_iu: "Vitamin D (IU)" },
    fields: {
      user: "Logged by", at: "Time", diaper_type: "Type", diaper_colour: "Stool colour", feed_method: "Method",
      feed_minutes: "Minutes", feed_ml: "ml", swallows: "Swallows heard", end_at: "End",
      date: "Date", time: "Time",
      measure_kind: "What", value: "Value", med_name: "Medication", dose: "Dose", activity: "Activity", note: "Note",
    },
    hints: {
      milk: "Typical: ~{lo}–{hi} ml per feed",
      milkDay: "~{dlo}–{dhi} ml/day at ~{f} feeds",
      infoAge: "Guideline for this age – week 1 follows stomach capacity, later typical feed sizes. Not a target: follow your baby's cues when breastfeeding (sources S119–S121 in the registry).",
      infoWeight: "From the latest weight ({w} kg): 150–180 ml/kg/day ÷ ~{f} feeds/day. A guide, not a target – follow baby's cues; intake temporarily spikes during growth spurts (weeks 3 & 6, months 3 & 6). Sources: Voedingscentrum NL + CZ paediatric practice (S119/S120).",
    },
    scale: {
      title: "Feeding amount from scale photos", titleManual: "Before/after weigh-in (kg)",
      before: "Before feed", after: "After feed",
      take: "Take photo", upload: "Upload",
      kg: "kg", auto: "read from display", manual: "couldn't read – enter value manually",
      aiWait: "AI is reading the photo…", autoAi: "read from photo (AI)",
      fromStash: "previously measured value", badKg: "Enter a valid weight – kg (6.24) or grams (6240)",
      delta: "Drank: +{g} g (~{ml} ml)", bad: "Difference {g} g makes no sense – check the values.",
      offer: "Add scale photos?", offerBtn: "Add scale",
      photosFail: "Entry saved, photos could not be uploaded.",
    },
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", none: "—", now: "now",
    confirmDelete: "Delete?", confirmDelete2: "Really delete",
    startSleep: "Start sleep", stopSleep: "Stop sleep", stopFeed: "Stop feed",
    sleepRunning: "Sleep running", feedRunning: "Feed running", since: "since",
    startWalk: "Start walk", stopWalk: "Stop walk", walkRunning: "Walk running",
    startBath: "Start bath", stopBath: "Stop bath", bathRunning: "Bath running",
    startActivity: "Start activity", stopActivity: "Stop activity", activityRunning: "Activity running",
    pause: "Pause", resume: "Resume", pausedTag: "paused", pausedMin: "paused {n} min",
    actTimerOn: "{name} is running – stop it in the bar above",
    refreshed: "Refreshed",
    running: "running", stop: "Stop",
    today: "Today", yesterday: "Yesterday", week: "7 days", days14: "14 days", days30: "30 days", day: "Day",
    summaryTitle: "Today", entriesTitle: "Entries", statsTitle: "Charts", insightsTitle: "Tips & trends", tableTitle: "Daily summary",
    stat: { nappies: "Nappies", feeds: "Feeds", sleep: "Sleep", care: "Care", weight: "Weight", notes: "Notes", ml: "Expressed" },
    table: { date: "Day", wet: "Wet", dirty: "Dirty", feeds: "Feeds", sleep: "Sleep (h)", weight: "Weight" },
    chart: { output: "Output", feeds: "Feeds", sleep: "Sleep", weight: "Weight", care: "Care" },
    noData: "Not enough data yet.", empty: "No entries yet.", loadMore: "Load older",
    offline: "Saved offline – we will retry when the network is back.",
    ageOne: "day", ageFew: "days", ageMany: "days", ageLabel: "Age",
    saved: "Saved", undo: "Undo", retry: "Retry", language: "SK",
    filters: { all: "All", kind: "Type", user: "Who" },
    lastEvents: "Latest entries", quickTitle: "Log quickly", fastTitle: "One-tap diaper", qkTemp: "temperature",
    addTitle: "Add entry", timersTitle: "Timers",
    nextFeed: "Last feed", nextFeedAgo: "ago", nextFeedDue: "feeding time", nextFeedIn: "in",
    notices: { title: "Important notices", more: "Details in Tips", review: "Review", openSource: "Show source", dayNoEntries: "no entries this day" },
    kontrola: {
      title: "Record review", range: "Window", empty: "No records to review – everything checks out.",
      saved: "Saved", proposed: "Proposed", sevBad: "error", sevWarn: "watch", sevInfo: "info",
      fix: "Fix", manual: "Edit manually", keep: "Keep", endNow: "End now", cancelEntry: "Cancel entry",
      clearEnd: "Clear end time", swap: "Swap start and end", delSecond: "Delete second",
      addFeed: "Add feed", addEntry: "Add entry", context: "Day context", fixed: "Fixed",
      noAuto: "No automatic proposal – check the entry.", duration: "Duration", end: "End", at: "Start", value: "Value",
    },    tasks: {
      title: "Reminders", manage: "Manage", add: "Add reminder", none: "No reminders yet.",
      done: "Done", skip: "Skip", undo: "Undo", overdue: "overdue", today: "today",
      editTitle: "Reminder", newTitle: "New reminder", name: "Name", detail: "Detail",
      icon: "Icon", color: "Color", repeat: "Repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
      days: "Days", timesPerDay: "Times per day", interval: "Gap (min)", startTime: "Start", duration: "Duration (min)",
      startDate: "From", endDate: "To", active: "Active", inactive: "Inactive", preview: "Times",
      calendar: "Calendar", calendarSub: "Subscribable .ics for iOS/Ubuntu", saved: "Reminder saved", deleted: "Reminder deleted",
      weekdays: { 0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun" },
    },
    nav: { today: "Today", log: "Log", stats: "Charts", kontrola: "Review", insights: "Tips", doctor: "Doctor" },
    doctor: {
      title: "Doctor / pediatrician",
      intro: "A list to consult with the pediatrician – not medical advice. Generated from your records and the watch-outs report (reports/2026-10-12).",
      questionsTitle: "Questions from your data", questionsNone: "No questions from current records – nothing irregular.",
      checklistTitle: "Checklist (age windows)",
      copy: "Copy questions", copied: "Copied to clipboard",
      srcNote: "Items marked [verify] have a source in sources/SOURCES.md; Slovak specifics still need confirming.",
      qTemp: "Temperature {t} °C ({d}) – under 3 months at ≥ 38 °C contact a doctor. Confirm the plan.",
      qWeightLow: "Gain {per} g/day is below the WHO 5th centile – check feeding and weight.",
      qWeightWatch: "Gain {per} g/day is between the WHO 5th and 10th centile – monitor, ask for advice.",
      qRegain: "At {age} days the weight {last} g is still below the initial {first} g – consult.",
      qWet: "Average {n} wet nappies/day (at least 6 expected from day 5) – check intake.",
      qStool: "Average {n} stools/day (at least 2 expected from day 4) – check intake.",
      qFeedLow: "Average {n} feeds/day (typically 8–12 or more) – assess feeding.",
      qGap: "Longest gap {n} min ({d}) – agree whether to wake for feeds and until when.",
      qColour: "{colour} stool ({d}) – check whether it is a warning.",
      qMl: "Feed of {ml} ml ({d}) – check the volume at age {age} days.",
      qVitaminD: "We give vitamin D {iu} IU/day – compare with guidance (ESPGHAN/EAP 400 IU; SK practice 600–800 IU from week 2), confirm duration with the doctor.",
      qWeightCadence: "We weigh {n}× per week – confirm how often to weigh and whether at the doctor too.",
      qScreening: "Newborn screening (heel prick, hearing, hip ultrasound) – confirm scope and dates ([verify]).",
      qHip: "Hip check – when for the ultrasound and whether it is needed ([verify]).",
      qFeeding: "Feeding: {n} feeds/day, average {ml} ml, gaps {avg} min – is intake reasonable?",
      qSleep: "Sleep {h} h/day, longest stretch {max} min – is this normal at this age?",
      qParents: "Mother: sleep debt, mood; father: paternal perinatal depression too – where to go with it ([verify]).",
      clNewborn: "Newborn checks – weight, jaundice, cord; date of the first check ([verify]).",
      clScreening: "Screening: heel prick (NÚDŠ) and hearing screening – confirm results ([verify]).",
      clHip: "Hip ultrasound around 6–12 weeks – book early ([verify]).",
      clVitaminD: "Vitamin D: ESPGHAN/EAP 400 IU/day; SK practice 600–800 IU/day from week 2 – confirm dose with the doctor.",
      clVaccines: "Vaccination per the ÚVZ SR calendar – first hep B within 24 h ([verify]).",
      cl6w: "6–8 week check: weight, development, hips, first vaccine doses.",
      cl3m: "~3 month check: second vaccine doses, development; at temperature ≥ 38 °C see a doctor immediately.",
      clSolids: "~6 months: start solids, allergens per our decision (see decision 2026-10-09).",
    },
    settings: {
      title: "Settings", language: "Language", theme: "Theme", themeAuto: "Auto", themeDark: "Dark", themeLight: "Light",
      anim: "Animations", animSub: "Gentle transitions when navigating and acting", animAuto: "Auto", animOn: "On", animOff: "Off",
      scale: "Scale weigh-ins", scaleSub: "Take a photo of the scale display or upload one from your gallery. Before/after weights work without photos too – enter the kg and the milk amount is computed for you.", scalePhoto: "Photo + manual", scaleManual: "Manual only", scaleOff: "Off",
      sources: "Recommendation sources", sourcesSub: "Choose which sources may be cited in Tips. Thresholds stay the most conservative regardless of selection.", sourcesAll: "Enable all",
      qkTitle: "Quick log shortcuts", qkSub: "Edit the tiles, groups and gaps of the Today card; add one-tap medications or activities.", qkEdit: "Arrange", qkAddSub: "Add a one-tap tile", qkMedPh: "medication name", qkActPh: "activity name", qkDosePh: "dose (optional)", qkAdd: "Add", qkDel: "Delete", qkUp: "Move up", qkDown: "Move down", qkTypeMed: "med", qkTypeAct: "activity",
      qkPausable: "Pausable (starts a live timer)", qkGroups: "Groups and gaps",
      qkGroupsSub: "A heading huddles tiles into a section; a gap adds an empty cell in the grid.",
      qkGroupPh: "group name (e.g. Evening)", qkGroupAdd: "Add group", qkGapAdd: "Add gap", qkGap: "Empty space",
      gridTitle: "Today card layout", gridSub: "Toggle which tiles appear. Drag the handle to reorder; or focus the handle and press ↑ / ↓.", qkDrag: "Grab and move",
      llm: "AI assistant", llmSub: "Optional. OpenAI, Anthropic or any OpenAI-compatible API – e.g. a local Ollama snap.", llmOff: "Off", llmCustom: "Custom URL", llmModelPh: "or type a model name manually", llmKeyKeep: "•••••••• (empty = keep)", llmKeyPh: "API key", llmTest: "Test", llmTesting: "Testing…", llmTestOk: "✓ Reply:", llmTestFail: "✗ Test failed:", llmDetect: "Detect local Ollama", llmDetected: "Found {n} model(s) – pick one in the Model dropdown", llmNone: "Local Ollama not found", llmSaveFail: "Save failed", llmNote: "The key stays on the server (0600 file). Tips stay deterministic – AI is only called once configured.",
      llmSetup: "AI endpoint", llmSteps: "Enter the address and hit Test – we check the endpoint answers and load its model list into the dropdown.", llmPick: "– test the address first –", llmModelsOk: "✓ Loaded {n} models from the endpoint", llmNoModels: "Endpoint answered but listed no models – type the name manually.",
      remind: "Feed reminder", remindSub: "Alerts when a feed has not been logged for a while",
      trends: "Trends", trendsSub: "Automatically removes unreliable days from trends (e.g. first day started in the evening).",
      trendAuto: "Auto", trendAll: "All",
      remindEvery: "Interval (min)", test: "Test alert", export: "Export CSV", cert: "CA certificate",
      ignored: "Ignored & acknowledged", ignoredSub: "hidden or acknowledged from Today and Tips", ignoredOpen: "Show",
      queue: "Offline queue", queueEmpty: "empty", version: "Version", noNotif: "Install the app (PWA) for notifications",
    },
    insights: {
      weightTitle: "Weight gain", weightBig: "{per} g/day",
      weightBand: "WHO GVS: median +{med} g per {per} days at this age (10th centile {p10} g)",
      weightOk: "Gain is above the 10th centile of the WHO velocity standard.",
      weightWatch: "Gain between the 5th and 10th centile – monitor and consult your pediatrician.",
      weightLow: "Gain below the WHO 5th centile – contact your pediatrician.",
      weightFew: "Not enough weigh-ins to compute a trend.",
      regainTitle: "Weight vs. initial", regainOk: "Latest weight {last} g is above the initial {first} g.",
      regainWarn: "At {age} days the weight {last} g is still below the initial {first} g. Most babies are back at birthweight by 3 weeks.",
      feedTitle: "Feeds per day", feedBig: "{n}/day",
      feedOk: "Feed on demand with no frequency cap; the first weeks usually mean at least 8–12 feeds/24 h.",
      feedLow: "Below 8 feeds/24 h – offer the breast more often on demand; have feeding checked.",
      feedHigh: "Above 12/24 h – often normal in early weeks; watch weight and nappies.",
      intervalBig: "average gap {n} min", interval: "Longest gap {max} min.",
      gapTitle: "Longest feed gap", gapBig: "{n} min",
      gapSub: "In the first days babies typically feed every 1–3 h. A gap of {t} is longer – in early weeks it is reasonable to wake to feed.",
      sleepTitle: "Sleep per day", sleepBig: "{h} h/day",
      sleepNoRef: "Descriptive value from your records; no verified reference range found in SK/EU sources [unsourced] – ask your pediatrician.",
      diaperTitle: "Wet nappies", diaperBig: "{n}/day",
      diaperOk: "From day 5, at least 6 heavy wet nappies per 24 h.",
      diaperLow: "Fewer than 6 wet nappies per 24 h (from day 5) – contact your pediatrician.",
      stoolTitle: "Stools per day", stoolBig: "{n}/day",
      stoolOk: "From day 4, at least 2 soft yellow stools a day.",
      stoolLow: "Fewer than 2 stools a day (from day 4) – check feeding, contact your pediatrician.",
      feverTitle: "Temperature ≥ 38 °C", feverBig: "{t} °C",
      feverSub: "Under 3 months, a temperature ≥ 38 °C = contact a doctor immediately [unsourced – verify with your pediatrician]. {d}",
      trendTitle: "Last 3 days trend", trendFeeds: "Feeds {d}", trendSleep: "Sleep {d} h", trendOutput: "Output {d}",
      trendFlat: "No notable change versus the previous days.",
      longestTitle: "Longest sleep stretch", longestBig: "{n} min",
      longestSub: "Longest continuous sleep in the range. {note}",
      longestNoteNight: "Night stretch {t} – a long night block is fine if baby wakes to feed.",
      qualityTitle: "Record quality", qualityBig: "{d} days",
      qualitySub: "Missing weight: {w} days · no entries: {n}",
      partialTitle: "Today (partial)", partialBig: "{wet} wet · {stool} stools · {feeds} feeds",
      partialSub: "The day is not finished; threshold warnings use completed days only.",
      completedDays: "From completed days: {n}.",
      excludedTitle: "Days removed from trend", excludedBig: "{n}",
      excludedSub: "{days} – automatically removed as unreliable logging days (late start or too few entries).",
      signalsTitle: "Signals and outlier checks", signalsBig: "{n}", signalsNone: "No suspicious signals in the range.", signalsMore: "+{n} more",
      sigFutureTitle: "Future time", sigFutureText: "{kind} {at} is more than 30 min in the future – check the device date/time or the picked time.",
      sigEndBeforeTitle: "End before start", sigEndBeforeText: "{kind} {at} → {end} – invalid, check the entry.",
      sigLongSleepTitle: "Very long sleep", sigLongSleepText: "{n} min sleep ({at}) – possible unstopped timer or missed wake-up.",
      sigLongFeedTitle: "Very long feed", sigLongFeedText: "{n} min feed ({at}) – possible mistake or unstopped timer.",
      sigLongTimerTitle: "Long open timer", sigLongTimerText: "{kind} has been running {n} min without end – probably forgot to stop it.",
      sigDuplicateTitle: "Duplicate", sigDuplicateText: "Two {kind} entries almost at the same time ({at}) – possible double tap.",
      sigMissingDayTitle: "Missing day", sigMissingDayText: "{date} has almost no entries – logging gap.",
      sigPartialDayTitle: "Unreliable day", sigPartialDayText: "{date} starts at {time} and has few entries – removed from trend.",
      sigSleepOverlapTitle: "Overlapping sleep", sigSleepOverlapText: "Sleep {a} and {b} overlap – possible new sleep started before stopping the old one.",
      sigSleepHighTitle: "High sleep", sigSleepHighText: "{date}: {h} h sleep – possible illness or missing logs.",
      sigSleepLowTitle: "Low sleep", sigSleepLowText: "{date}: {h} h sleep – possible missing logs.",
      sigFeedGapTitle: "Long gap", sigFeedGapText: "{n} min gap between feeds ({at}) – possible long sleep or missed feed.",
      sigFeedClusterTitle: "Many feeds", sigFeedClusterText: "{date}: {n} feeds – cluster feeding or duplicate entries.",
      sigNoWetTitle: "No wet nappy", sigNoWetText: "No wet nappy logged since {last} – dehydration or missing logs.",
      sigStoolColourTitle: "Stool colour", sigStoolColourText: "{colour} stool {at} – black after day 3 or red can be a warning.",
      sigTempHighTitle: "Temperature", sigTempHighText: "{t} °C {at} – under 3 months at 38 °C contact a doctor.",
      sigTempLowTitle: "Low temperature", sigTempLowText: "{t} °C {at} – check measurement and baby.",
      sigWeightJumpTitle: "Weight jump", sigWeightJumpText: "{from} → {to} g ({per} g/day) – possible typo.",
      sigWeightDropTitle: "Weight drop", sigWeightDropText: "{from} → {to} g – drop {pct}%; check weight and intake.",
      sigWeightRangeTitle: "Weight out of range", sigWeightRangeText: "{g} g is outside newborn range – check units.",
      sigMlHighTitle: "High ml", sigMlHighText: "{ml} ml feed {at} – possible typo or large volume.",
      sigWetLowTitle: "Wet nappies", sigWetLowText: "Completed-day average is {n}/day from day 5 – minimum is 6.",
      sigStoolLowTitle: "Stools", sigStoolLowText: "Completed-day average is {n}/day from day 4 – minimum is 2.",
      sigWeightLowTitle: "Weight gain", sigWeightLowText: "{per} g/day is below the WHO 5th centile – contact your pediatrician.",
      sigWeightWatchTitle: "Weight gain", sigWeightWatchText: "{per} g/day is between the WHO 5th and 10th centile – monitor.",
      dismiss: "Ignore", undoDismiss: "Restore", dismissedToast: "Hidden from the overview",
      ignoredBtn: "Ignored ({n})", ignoredTitle: "Ignored warnings",
      ignoredSub: "Hidden from the main overview (Today and Tips). Restoring brings them back.",
      ignoredNone: "Nothing is ignored.", ignoredRestoreAll: "Restore all", ignoredAt: "ignored {at}",
      ignoredNote: "For a serious warning consider restoring it and asking your pediatrician – ignoring it does not change what the data show.",
      ack: "Acknowledge", ackTitle: "Acknowledge warning",
      ackReason: "Why this is fine (optional)", ackReasonPh: "e.g. she slept 5 h straight – we deliberately did not wake her",
      ackScope: "Applies to", ackOnce: "Just this occurrence", ackRule: "Similar signals",
      ackDur: "Rule expires", ack7: "after 7 days", ack30: "after 30 days", ackForever: "never expires",
      ackCapNote: "Similar signals up to {n} will be suppressed; larger ones will still alert you.",
      ackBadNote: "Heads up: this is a serious warning. Acknowledging hides it from the overview, but the data stay as they are.",
      ackSaved: "Acknowledged", undoAck: "Undo",
      mgrBtn: "Ignored & acknowledged ({n})", mgrTitle: "Ignored & acknowledged",
      mgrSub: "Hidden from Today and Tips. An acknowledgement can carry a reason and a rule that suppresses similar signals of this kind.",
      ackKindHide: "ignored", ackKindAck: "acknowledged", ackRuleLabel: "rule – suppresses similar signals",
      ackUntil: "until {until}", ackUntilForever: "never expires", ackMaxUpTo: "max {n}",
      mgrNone: "Nothing is ignored or acknowledged.", mgrAt: "saved {at}",
      ackCapAll: "The rule suppresses every future signal of this kind; other kinds stay unchanged.",
      moreSignals: "+{n} more", fewerSignals: "Fewer", noSignals: "No un-ignored signals.",
      srcIntro: "Sources – open in a new tab:",
      tagMeasured: "computed from your records",
      srcWho: "WHO GVS (velocity)", srcNhs: "NHS", srcNhs23: "NHS (weight)", srcAbm: "ABM #3", srcAwmf: "AWMF S3", srcAepap: "AEPap", srcAap: "AAP", srcPtgh: "PTGHiŻDz", srcMzsrf: "MZ SR BFHI (SK)", srcUnsourced: "[unsourced]", srcOff: "sources off",
      disclaimer: "Reference values come from registered sources (MZ SR, WHO, NHS, AAP, ABM, AWMF, PTGHiŻDz) – details and toggling in Settings → Sources. Tips are computed deterministically from your records, no AI. Not medical advice – contact your pediatrician about outliers.",
    },
    errors: {
      bad_value: "invalid value", bad_number: "invalid number", out_of_range: "out of range",
      bad_datetime: "invalid time", required: "required", before_start: "end is before start",
      nothing_to_update: "nothing to change", bad_json: "bad input", empty_body: "empty input",
      too_large: "text too long", network: "server unreachable", request_failed: "request failed",
    },
  },
};

const PATHS = {
  home: "M3 10.6 12 3.2l9 7.4V20a1.5 1.5 0 0 1-1.5 1.5H15V15H9v6.5H4.5A1.5 1.5 0 0 1 3 20z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  chart: "M3.5 3.5v17h17M8 16.5v-5M13 16.5v-9M18 16.5v-6",
  bulb: "M9.5 18.5h5M11 21.5h2M12 2.5a6.5 6.5 0 0 0-3.6 11.9c.7.5 1.1 1.3 1.1 2.1v.5h5v-.5c0-.8.4-1.6 1.1-2.1A6.5 6.5 0 0 0 12 2.5z",
  gear: "M12.9 2.6h-1.8a1.9 1.9 0 0 0-1.9 1.9v.2a1.7 1.7 0 0 1-.85 1.47l-.16.09a1.7 1.7 0 0 1-1.7 0l-.15-.09a1.9 1.9 0 0 0-2.6.69l-.9 1.56a1.9 1.9 0 0 0 .46 2.26l.13.11a1.7 1.7 0 0 1 0 2.62l-.13.11a1.9 1.9 0 0 0-.46 2.26l.9 1.56a1.9 1.9 0 0 0 2.6.69l.15-.09a1.7 1.7 0 0 1 1.7 0l.16.09a1.7 1.7 0 0 1 .85 1.47v.2a1.9 1.9 0 0 0 1.9 1.9h1.8a1.9 1.9 0 0 0 1.9-1.9v-.2a1.7 1.7 0 0 1 .85-1.47l.16-.09a1.7 1.7 0 0 1 1.7 0l.15.09a1.9 1.9 0 0 0 2.6-.69l.9-1.56a1.9 1.9 0 0 0-.46-2.26l-.13-.11a1.7 1.7 0 0 1 0-2.62l.13-.11a1.9 1.9 0 0 0 .46-2.26l-.9-1.56a1.9 1.9 0 0 0-2.6-.69l-.15.09a1.7 1.7 0 0 1-1.7 0l-.16-.09A1.7 1.7 0 0 1 14.8 4.7v-.2a1.9 1.9 0 0 0-1.9-1.9zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  plus: "M12 5.5v13M5.5 12h13",
  x: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  pencil: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.5 7l.9 12.4a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  play: "M8 5.5v13l11-6.5z",
  pause: "M9.5 5v14M14.5 5v14",
  stop: "M7.5 7.5h9v9h-9z",
  download: "M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 20.5h15",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 12h17M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18",
  moon: "M20.5 13.3A8.5 8.5 0 1 1 10.7 3.5a7 7 0 0 0 9.8 9.8z",
  bottle: "M9.5 2.5h5M10.5 2.5v3.2M13.5 2.5v3.2M9 8.6a3 3 0 0 1 1.5-2.7v-.2h3v.2A3 3 0 0 1 15 8.6v9.9a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 9 18.5zM9 12.5h6",
  diaper: "M4.5 5.5h15v3.2c0 5.2-3.2 9.6-7.5 11.8C7.7 18.3 4.5 13.9 4.5 8.7zM4.5 8.7h15",
  walk: "M13.2 5.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM13 7.5l-2.5 4.5 3 1.8v5.7M10.5 12l-3 1.2M13.5 13.8l2.6 1.4.8 3.3M9.8 9.2l3.2-1.7 2.9 2.4 2.3.4",
  bath: "M4 12.5h16v2.2a4.8 4.8 0 0 1-4.8 4.8H8.8A4.8 4.8 0 0 1 4 14.7zM7 12.5V6.2a2 2 0 0 1 4 0M15.5 5.6c.9 1 .9 2 0 3M18.2 5c.9 1 .9 2 0 3M6.5 21l-.8 1M17.5 21l.8 1",
  pill: "M10.6 3.6 3.6 10.6a5 5 0 0 0 7.1 7.1l7-7a5 5 0 0 0-7.1-7.1zM7.1 7.1l7 7",
  star: "M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z",
  scale: "M4.5 5.5h15A1.5 1.5 0 0 1 21 7v12a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19V7a1.5 1.5 0 0 1 1.5-1.5zM12 8.5A3.5 3.5 0 0 0 8.5 12h7A3.5 3.5 0 0 0 12 8.5zM12 12v3.5",
  note: "M5 3.5h9.5L20 9v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1.5-1.5zM14 3.5V9h5.5M8 13h8M8 16.5h5",
  bell: "M18 8.5a6 6 0 1 0-12 0c0 5.5-2 7-2 7h16s-2-1.5-2-7M10.3 19.5a2 2 0 0 0 3.4 0",
  filter: "M4 5.5h16l-6.2 7.3v5.4l-3.6 2.3v-7.7z",
  chevron: "M9 5.5l6.5 6.5L9 18.5",
  caretUp: "M6.5 15l5.5-6 5.5 6",
  caretDown: "M6.5 9l5.5 6 5.5-6",
  check: "M4.5 12.5l5 5 10-11",
  undo: "M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4",
  calendar: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 3.5v3M15.5 3.5v3",
  heart: "M12 20.5S4 15.5 4 10.2A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 8 2.6c0 5.3-8 10.3-8 10.3z",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4",
  refresh: "M20 12a8 8 0 1 1-2.3-5.6M20 3.5V8h-4.5",
  external: "M18.5 13.5v4a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h4M14 4.5h5.5V10M19.5 4.5 11.5 12.5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z",
  camera: "M9 5.8h1.7l1-1.8h2.6l1 1.8H18a1.6 1.6 0 0 1 1.6 1.6v9.7A1.6 1.6 0 0 1 18 18.7H6a1.6 1.6 0 0 1-1.6-1.6V7.4A1.6 1.6 0 0 1 6 5.8zM12 16.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z",
  upload: "M12 15.5v-11M7.5 8.5l4.5-4.5 4.5 4.5M4.5 20.5h15",
  grip: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
};

const KIND_ICONS = { diaper: "diaper", feed: "bottle", sleep: "moon", walk: "walk", bath: "bath", medication: "pill", activity: "star", task: "bell", measure: "scale", note: "note" };
const KIND_ORDER = ["diaper", "feed", "sleep", "walk", "bath", "medication", "activity", "measure", "note"];
const TIMER_KINDS = ["feed", "sleep", "walk", "bath", "activity"];
const SELECT_DICT = { diaper_type: "diaper_types", diaper_colour: "diaper_colours", feed_method: "feed_methods", measure_kind: "measure_kinds" };
const VIEWS = ["today", "log", "stats", "kontrola", "insights", "doctor"];
const VIEW_ICONS = { today: "home", log: "list", stats: "chart", kontrola: "bell", insights: "bulb", doctor: "heart" };
const CHART_TABS = ["output", "feeds", "sleep", "weight", "care"];

let lang = localStorage.getItem("baby.lang") || (navigator.language.startsWith("sk") ? "sk" : "en");
let user = localStorage.getItem("baby.user") || "";  // resolved to the server's first USERS id in loadMeta()
let meta = null;
let summary = null;
let view = VIEWS.includes((location.hash || "").replace("#", "")) ? location.hash.replace("#", "") : (localStorage.getItem("baby.view") || "today");
let logRange = "today";
let logFrom = null;
let jumpDay = null;
let filterKind = localStorage.getItem("baby.fkind") || "";
let filterUser = "";
let statsDays = Number(localStorage.getItem("baby.statsdays")) || 7;
let chartTab = CHART_TABS.includes(localStorage.getItem("baby.chart")) ? localStorage.getItem("baby.chart") : "output";
let timerStarting = false;
let liveInterval = null;
let lastFeedAt = null;
let tasks = [];
let taskCheckins = [];
const TASK_ICONS = ["bell", "pill", "calendar", "heart", "sun", "moon", "star", "walk", "bath", "bottle", "scale", "note", "clock", "home", "check"];
const TASK_COLORS = ["#2f8f78", "#d9822b", "#5b8def", "#b56576", "#8b5cf6", "#d64545", "#6b7280"];
let remindedAt = 0;
let logOffset = 0;
const LOG_PAGE = 120;

const $ = (id) => document.getElementById(id);

function t(key, params) {
  const dict = I18N[lang];
  let value = key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), dict);
  if (typeof value !== "string") return key;
  if (params) for (const [k, v] of Object.entries(params)) value = value.replace("{" + k + "}", v);
  return value;
}

// Display label for a caregiver id: localized name if known (e.g. "others"), otherwise the raw id from server USERS.
function uLabel(name) {
  const v = t(`users.${name}`);
  return v === `users.${name}` ? name : v;
}

// Deterministic chip color per caregiver position in meta.users (cycled), independent of the id itself.
function userColorClass(name) {
  const i = meta && Array.isArray(meta.users) ? meta.users.indexOf(name) : -1;
  return i >= 0 ? " who-" + ((i % 4) + 1) : "";
}

function icon(name, cls) {
  return `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;
}

function h(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "style") {
      // CSP-safe: CSSOM instead of the style content attribute
      for (const decl of String(v).split(";")) {
        const idx = decl.indexOf(":");
        if (idx > 0) node.style.setProperty(decl.slice(0, idx).trim(), decl.slice(idx + 1).trim());
      }
    } else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  const appendKid = (kid) => {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(appendKid); return; }
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  };
  for (const kid of kids) appendKid(kid);
  return node;
}

function kindColorVar(kind) {
  return `--kc: var(--k-${kind})`;
}

function ageLabel(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n < 0) return "";
  let unit;
  if (n === 1) unit = t("ageOne");
  else if (lang === "sk") unit = n < 5 ? t("ageFew") : t("ageMany");
  else unit = n === 1 ? t("ageOne") : t("ageMany");
  return `${n} ${unit}`;
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function splitLocal(value) {
  if (!value) return ["", ""];
  const [date, time = ""] = String(value).split("T");
  return [date, time.slice(0, 5)];
}

function combineLocal(date, time) {
  if (!date || !time) return "";
  return `${date}T${String(time).slice(0, 5)}`;
}

function localInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoDay(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseStamp(s) {
  return s ? new Date(s) : null;
}

function minutesBetween(a, b) {
  if (!a || !b) return null;
  const m = Math.round((new Date(b) - new Date(a)) / 60000);
  return Number.isFinite(m) && m >= 0 ? m : null;
}

function fmtDuration(start, end) {
  const minutes = minutesBetween(start, end);
  if (minutes === null) return "";
  const h2 = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h2 ? `${h2} h ${m} min` : `${m} min`;
}

/* pausable timers: effective running time = wall clock minus accumulated pauses;
   an open-ended pause (paused_at set, not yet resumed) counts up to `refStamp`/end */
function fmtMin(minutes) {
  const h2 = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h2 ? `${h2} h ${m} min` : `${m} min`;
}
function pauseSecs(e, refMs) {
  let ps = e.pause_seconds || 0;
  if (e.paused_at) {
    const endMs = e.end_at ? new Date(e.end_at).getTime() : refMs;
    ps += Math.max(0, Math.round((endMs - new Date(e.paused_at).getTime()) / 1000));
  }
  return ps;
}
function effMinutes(e, refStamp) {
  const endMs = e.end_at ? new Date(e.end_at).getTime() : new Date(refStamp || localInput(new Date())).getTime();
  return Math.max(0, Math.floor((endMs - new Date(e.at).getTime() - pauseSecs(e, endMs) * 1000) / 60000));
}
function durLabel(e) {
  let s = fmtMin(effMinutes(e, e.end_at));
  const p = Math.round((e.pause_seconds || 0) / 60);
  if (p >= 1) s += ` · ${t("pausedMin", { n: p })}`;
  return s;
}

function fmtClock(stamp) {
  return stamp ? stamp.slice(11) : "";
}

function dayName(dayIso) {
  const d = new Date(dayIso + "T12:00");
  const opts = { weekday: "short", day: "numeric", month: "short" };
  const label = d.toLocaleDateString(lang === "sk" ? "sk-SK" : "en-GB", opts);
  if (dayIso === isoDay(new Date())) return `${t("today")} · ${label}`;
  if (dayIso === isoDay(new Date(Date.now() - 864e5))) return `${t("yesterday")} · ${label}`;
  return label;
}

/* ---------- api + offline queue ---------- */

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "request_failed");
    error.status = response.status;
    error.fields = data.errors || null;
    throw error;
  }
  return data;
}

function queued() {
  try { return JSON.parse(localStorage.getItem("baby.queue") || "[]"); } catch { return []; }
}

function enqueue(task) {
  const queue = queued();
  queue.push(task);
  localStorage.setItem("baby.queue", JSON.stringify(queue));
}

async function flushQueue() {
  const queue = queued();
  if (!queue.length) return false;
  const left = [];
  for (const task of queue) {
    try { await api(task.path, { method: task.method, body: JSON.stringify(task.body) }); }
    catch (error) { if (error.status) continue; left.push(task); }
  }
  localStorage.setItem("baby.queue", JSON.stringify(left));
  return queue.length !== left.length;
}

async function loadMeta() {
  meta = await api(API.meta);
  // caregiver list is server config (USERS env) — adopt it, repair a stale local selection
  if (meta && Array.isArray(meta.users) && meta.users.length && !meta.users.includes(user)) {
    user = meta.users[0];
    localStorage.setItem("baby.user", user);
  }
}
let llmCfg = null;
async function loadLlm() { try { const d = await api(API.llm); if (d && d.llm) llmCfg = d.llm; } catch { /* LLM endpoint missing on older servers */ } }
async function loadSummary() { summary = await api(`${API.summary}?days=${Math.max(7, statsDays)}`); }

async function loadEntries({ from, kind, user: who, limit = LOG_PAGE, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set("from", from);
  if (kind) params.set("kind", kind);
  if (who) params.set("user", who);
  const data = await api(`${API.entries}?${params}`);
  let rows = data.entries;
  if (offset) rows = rows.slice(offset, offset + limit);
  return rows;
}

/* ---------- toasts ---------- */

function toast(text, opts = {}) {
  const box = $("toasts");
  const node = h("div", { class: "toast" + (opts.err ? " err" : "") },
    h("span", { html: icon(opts.icon || "check", "sm") + " " }),
    h("span", {}, text));
  node.firstChild.innerHTML = icon(opts.icon || "check", "sm");
  if (opts.action) {
    node.append(h("button", { type: "button", onclick: () => { opts.action(); leaveNode(node); } }, opts.actionLabel));
  }
  box.append(node);
  setTimeout(() => leaveNode(node), opts.ms || 4200);
}

/* ---------- header / nav ---------- */

function renderHeader() {
  document.documentElement.lang = lang;
  document.title = t("title");
  $("title").textContent = t("title");
  $("age").textContent = meta ? ageLabel(meta.age_days) : "";
  $("mark").innerHTML = icon("heart");
  $("langBtn").innerHTML = `<span>${t("language")}</span>`;
  $("settingsBtn").innerHTML = icon("gear");
  $("csvBtn").innerHTML = icon("download");
  $("csvBtn").title = t("settings.export");
  $("offlineNote").textContent = t("offline");
  measureTopbar();
}

function measureTopbar() {
  const root = document.documentElement;
  const bar = document.querySelector(".topbar");
  if (bar) root.style.setProperty("--topbar-h", `${Math.round(bar.getBoundingClientRect().height)}px`);
  const lb = $("liveBar");
  if (lb) root.style.setProperty("--livebar-h", lb.classList.contains("hidden") ? "0px" : `${Math.round(lb.getBoundingClientRect().height)}px`);
}

function renderNav() {
  for (const [id, compact] of [["tabsDesktop", false], ["tabsMobile", true]]) {
    const nav = $(id);
    nav.innerHTML = "";
    for (const name of VIEWS) {
      const btn = h("button", {
        type: "button", "data-tab": name,
        class: name === view ? "on" : "",
        onclick: () => go(name),
      }, h("span", { html: icon(VIEW_ICONS[name], compact ? "" : "sm") }), h("span", {}, t(`nav.${name}`)));
      nav.append(btn);
    }
  }
}

function go(name) {
  if (!VIEWS.includes(name)) name = "today";
  view = name;
  localStorage.setItem("baby.view", name);
  if (location.hash !== `#${name}`) location.hash = name;
  renderNav();
  renderView();
  if (document.body.dataset.anim === "on") {
    const sec = $("view-" + name);
    sec.classList.add("anim-enter");
    setTimeout(() => sec.classList.remove("anim-enter"), 900);
  }
  window.scrollTo({ top: 0 });
}

/* ---------- live timer bar ---------- */

function openLogs() {
  if (!summary) return [];
  const seen = new Set();
  return (summary.open_logs || []).filter((log) => !log.end_at && log.id && !seen.has(log.id) && seen.add(log.id));
}

function renderLiveBar() {
  const bar = $("liveBar");
  const logs = openLogs();
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  if (!logs.length) { bar.classList.add("hidden"); bar.innerHTML = ""; measureTopbar(); return; }
  bar.classList.remove("hidden");
  const inner = h("div", { class: "liveinner" });
  bar.innerHTML = "";
  bar.append(inner);
  const byId = new Map(logs.map((l) => [l.id, l]));
  for (const log of logs) {
    const paused = !!log.paused_at;
    const name = log.activity || t(`kinds.${log.kind}`);
    const item = h("div", { class: "liveitem" + (paused ? " paused" : "") },
      h("span", { class: "pulse" }),
      h("span", { class: "lbl" }, `${name} · ${fmtClock(log.at)}${paused ? ` · ${t("pausedTag")}` : ""}`),
      h("span", { class: "elapsed", "data-live-id": String(log.id) }),
      h("div", { class: "live-actions" },
        log.pausable === 1 ? h("button", {
          type: "button", class: "mini ghost", title: t(paused ? "resume" : "pause"),
          "aria-label": t(paused ? "resume" : "pause"), "data-pause": String(log.id),
          html: icon(paused ? "play" : "pause", "sm"), onclick: () => togglePause(log),
        }) : null,
        h("button", { type: "button", class: "mini", title: t("edit"), html: icon("pencil", "sm"), onclick: () => openEntryDialog(log.kind, log) }),
        h("button", { type: "button", class: "primary", onclick: () => stopTimer(log) }, t("stop"))
      )
    );
    inner.append(item);
  }
  const paint = () => {
    const refStamp = localInput(new Date());
    inner.querySelectorAll("[data-live-id]").forEach((el) => {
      const l = byId.get(Number(el.getAttribute("data-live-id")));
      if (l) el.textContent = fmtMin(effMinutes(l, refStamp));
    });
  };
  paint();
  liveInterval = setInterval(paint, 1000);
  measureTopbar();
}

async function stopTimer(log) {
  const body = { end_at: localInput(new Date()) };
  try { await api(`${API.entries}/${log.id}`, { method: "PUT", body: JSON.stringify(body) }); }
  catch (error) { if (!error.status) enqueue({ path: `${API.entries}/${log.id}`, method: "PUT", body }); }
  await refresh();
  if (log.kind === "feed" && scaleMode() !== "off") {
    const st = getScaleStash();
    if (st && st.g && Date.now() - st.ts < 3 * 3600e3) {
      toast(t("scale.offer"), { icon: "scale", ms: 6000, actionLabel: t("scale.offerBtn"), action: async () => {
        try {
          const recent = await loadEntries({ from: isoDay(new Date()), kind: "feed", limit: 15 });
          const r = recent.find((x) => x.id === log.id);
          if (r) openEntryDialog("feed", r);
        } catch { /* offline: prompt will not resolve */ }
      } });
    }
  }
}

async function togglePause(log) {
  const action = log.paused_at ? "resume" : "pause";
  try { await api(`${API.entries}/${log.id}/${action}`, { method: "POST", body: JSON.stringify({}) }); }
  catch { showOffline(); return; }
  await refresh();
}

async function startTimer(kind, feedMethod = null, extra = null) {
  if (!meta || timerStarting || !TIMER_KINDS.includes(kind)) return;
  timerStarting = true;
  let body = null;
  try {
    body = { user, kind, at: localInput(new Date()), timer: 1 };
    if (extra) Object.assign(body, extra);
    if (kind === "feed") {
      const method = feedMethod || feedMethodDefault();
      body.feed_method = method;
      localStorage.setItem("baby.feed_method", method);
    }
    await api(API.entries, { method: "POST", body: JSON.stringify(body) });
    await refresh();
    toast(extra && extra.activity ? t("actTimerOn", { name: extra.activity }) : t("saved"), { icon: KIND_ICONS[kind] });
  } catch (error) {
    if (!error.status && body) enqueue({ path: API.entries, method: "POST", body });
    showOffline();
    await refresh().catch(() => {});
  } finally {
    timerStarting = false;
  }
}

async function quickDiaper(type) {
  const body = { user, kind: "diaper", at: localInput(new Date()), diaper_type: type };
  let created = null;
  try {
    const data = await api(API.entries, { method: "POST", body: JSON.stringify(body) });
    created = data.entry;
    await refresh();
    toast(`${t("kinds.diaper")} · ${t(`diaper_types.${type}`)}`, {
      icon: "diaper", actionLabel: t("undo"),
      action: async () => {
        try { await api(`${API.entries}/${created.id}`, { method: "DELETE" }); }
        catch (error) { if (!error.status) enqueue({ path: `${API.entries}/${created.id}`, method: "DELETE", body: {} }); }
        await refresh();
      },
    });
  } catch (error) {
    if (!error.status) enqueue({ path: API.entries, method: "POST", body });
    showOffline();
    await refresh().catch(() => {});
  }
}

/* Editable home shortcuts: baby.quickOff = disabled tile ids (defaults all on),
   baby.quickOrder = user tile order (universe-reconciled), baby.quickCustom = custom
   one-tap tiles [{uid, type:"med"|"act", name, dose, icon?, pausable?}]. Order may also
   hold group headings g:<uid> (defs in baby.quickGroups = [{uid, name}]) and empty grid
   cells sp:<uid>. Default tile ids: feed:<method>, timer:<kind>, diaper:<type>,
   measure:temp. Migrated from legacy baby.quickMed. */
const isQGap = (id) => typeof id === "string" && id.startsWith("sp:");
const isQGrp = (id) => typeof id === "string" && id.startsWith("g:");
function qOff() { try { const v = JSON.parse(localStorage.getItem("baby.quickOff") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
function qOn(id) { return !qOff().includes(id); }
function quickDefs() {
  try {
    let v = JSON.parse(localStorage.getItem("baby.quickCustom") || "null");
    if (v === null) {
      const old = JSON.parse(localStorage.getItem("baby.quickMed") || "[]");
      v = Array.isArray(old) ? old.filter((x) => x && x.name).map((x) => ({ uid: newQuickUid(), type: "med", name: x.name, dose: x.dose || "" })) : [];
      localStorage.setItem("baby.quickCustom", JSON.stringify(v));
    }
    return Array.isArray(v) ? v.filter((x) => x && x.name && (x.type === "med" || x.type === "act")) : [];
  } catch { return []; }
}
function saveQuickDefs(list) { localStorage.setItem("baby.quickCustom", JSON.stringify(list)); }
function newQuickUid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const T_START = [["sleep", "startSleep"], ["walk", "startWalk"], ["bath", "startBath"], ["activity", "startActivity"]];
function quickUniverse() {
  const ids = [];
  for (const m of (meta ? meta.feed_methods : [])) ids.push(`feed:${m}`);
  for (const [k] of T_START) ids.push(`timer:${k}`);
  ids.push("measure:temp");
  for (const d of ["wet", "dirty", "mixed"]) ids.push(`diaper:${d}`);
  for (const def of quickDefs()) ids.push(def.uid);
  return ids;
}
function quickGroups() {
  try { const v = JSON.parse(localStorage.getItem("baby.quickGroups") || "[]"); return Array.isArray(v) ? v.filter((g) => g && g.uid) : []; } catch { return []; }
}
function saveQuickGroups(list) { localStorage.setItem("baby.quickGroups", JSON.stringify(list)); }

function quickOrder() {
  const uni = quickUniverse();
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem("baby.quickOrder") || "[]"); if (!Array.isArray(stored)) stored = []; } catch {}
  const grpUids = new Set(quickGroups().map((g) => g.uid));
  // group/gap tokens pass through untouched (unique per token); a group drops out once its def is deleted
  const res = stored.filter((id) => isQGap(id) || (isQGrp(id) ? grpUids.has(id.slice(2)) : uni.includes(id)));
  for (const id of uni) if (!res.includes(id)) res.push(id);
  return res;
}

async function quickLog(body, title, iconName) {
  let created = null;
  try {
    const data = await api(API.entries, { method: "POST", body: JSON.stringify(body) });
    created = data.entry;
    await refresh();
    toast(title, {
      icon: iconName, actionLabel: t("undo"),
      action: async () => {
        try { await api(`${API.entries}/${created.id}`, { method: "DELETE" }); }
        catch (error) { if (!error.status) enqueue({ path: `${API.entries}/${created.id}`, method: "DELETE", body: {} }); }
        await refresh();
      },
    });
  } catch (error) {
    if (!error.status) enqueue({ path: API.entries, method: "POST", body });
    showOffline();
    await refresh().catch(() => {});
  }
}
function quickMed(def) {
  return quickLog({ user, kind: "medication", at: localInput(new Date()), med_name: def.name, dose: def.dose || null },
    `${def.name}${def.dose ? ` · ${def.dose}` : ""}`, "pill");
}
function quickAct(def) {
  return quickLog({ user, kind: "activity", at: localInput(new Date()), activity: def.name }, def.name, "star");
}
function startActTimer(def) {
  return startTimer("activity", null, { activity: def.name, pausable: 1 });
}
function quickMeasureTemp() {
  openEntryDialog("measure");
  const seg = $("sheetBody").querySelector('[data-seg="measure_kind"]');
  const btn = seg && seg.querySelector('[data-seg-value="temp_c"]');
  if (btn) btn.click();
}
function feedMethodDefault() {
  const stored = localStorage.getItem("baby.feed_method");
  if (meta && meta.feed_methods.includes(stored)) return stored;
  return meta ? meta.feed_methods[0] : "breast_left";
}

/* ---------- pull-to-refresh (touch, Today view only) ----------
   Dragging down at the very top claims the gesture: the page stops scrolling and a
   refresh circle slides out from behind the sticky topbar; release past the trip
   distance and refresh() runs, spinner spins, then the circle retreats. */
const PTR_SLOP = 14, PTR_TRIP = 68;
let ptrState = null, ptrBusy = false, ptrEl = null;
function ptrWidget() {
  if (!ptrEl) {
    ptrEl = h("div", { class: "pullind", "aria-hidden": "true" }, h("span", { html: icon("refresh", "sm") }));
    document.body.append(ptrEl);
  }
  return ptrEl;
}
function ptrPaint(p, cls) {
  const el = ptrWidget();
  el.style.setProperty("--pp", String(p));
  el.classList.add("show");
  el.classList.toggle("dragging", !cls);
  el.classList.toggle("ready", cls === "ready");
  el.classList.toggle("busy", cls === "busy");
}
function ptrHide() {
  if (!ptrEl) return;
  ptrEl.style.setProperty("--pp", "0");
  ptrEl.classList.remove("show", "dragging", "ready", "busy");
}
window.addEventListener("touchstart", (e) => {
  ptrState = null;
  if (ptrBusy || view !== "today" || e.touches.length !== 1 || document.querySelector("dialog[open]")) return;
  if (window.scrollY > 0) return;
  ptrState = { y0: e.touches[0].clientY, dy: 0, claimed: false };
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (!ptrState || ptrBusy) return;
  const dy = e.touches[0].clientY - ptrState.y0;
  if (dy <= PTR_SLOP) return;
  if (window.scrollY > 0) { ptrState = null; return ptrHide(); }
  ptrState.claimed = true;
  ptrState.dy = dy;
  e.preventDefault(); // claim: no page scroll / iOS bounce / tile tap while pulling
  ptrPaint(Math.min(1, dy / PTR_TRIP), dy >= PTR_TRIP ? "ready" : undefined);
}, { passive: false });
const ptrCancel = () => { ptrState = null; if (!ptrBusy) ptrHide(); };
window.addEventListener("touchcancel", ptrCancel);
window.addEventListener("touchend", async () => {
  if (!ptrState) return;
  const fire = ptrState.claimed && ptrState.dy >= PTR_TRIP;
  ptrState = null;
  if (!fire) return ptrHide();
  ptrBusy = true;
  ptrPaint(1, "busy");
  try {
    await refresh();
    toast(t("refreshed"), { icon: "refresh" });
  } finally {
    ptrBusy = false;
    setTimeout(ptrHide, 350);
  }
});

/* ---------- today view ---------- */

const NOTICE_PREVIEW = 4;

function switchView(name) {
  if (!VIEWS.includes(name)) return;
  view = name;
  localStorage.setItem("baby.view", name);
  renderNav();
  renderView();
}

function taskWeekday(dateStr) {
  const d = new Date(`${dateStr}T12:00`);
  return (d.getDay() + 6) % 7;
}

function taskOccurrences(task, dateStr) {
  if (!task.active) return [];
  if (task.start_date && dateStr < task.start_date) return [];
  if (task.end_date && dateStr > task.end_date) return [];
  if (task.repeat === "weekly" && Array.isArray(task.days) && task.days.length && !task.days.includes(taskWeekday(dateStr))) return [];
  if (task.repeat === "monthly" && task.start_date && Number(dateStr.slice(8, 10)) !== Number(task.start_date.slice(8, 10))) return [];
  return (task.times || []).map((time) => `${dateStr}T${time}`);
}

function taskCheckinFor(taskId, scheduledAt) {
  return taskCheckins.find((c) => c.task_id === taskId && c.scheduled_at === scheduledAt) || null;
}

function upsertTaskCheckin(checkin) {
  if (!checkin) return;
  const idx = taskCheckins.findIndex((c) => c.task_id === checkin.task_id && c.scheduled_at === checkin.scheduled_at);
  if (idx >= 0) taskCheckins[idx] = checkin;
  else taskCheckins.push(checkin);
}

async function setTaskCheckin(task, scheduledAt, status) {
  const body = { task_id: task.id, scheduled_at: scheduledAt, status, user };
  try {
    const data = await api(API.taskCheckins, { method: "POST", body: JSON.stringify(body) });
    if (data.checkin) upsertTaskCheckin(data.checkin);
    else taskCheckins = taskCheckins.filter((c) => !(c.task_id === task.id && c.scheduled_at === scheduledAt));
  } catch (error) {
    if (!error.status) enqueue({ path: API.taskCheckins, method: "POST", body });
  }
  renderToday();
}

function remindersCard() {
  const card = h("section", { class: "card reminders-card" });
  const today = isoDay(new Date());
  const occurrences = [];
  for (const task of tasks.filter((x) => x.active)) {
    for (const scheduledAt of taskOccurrences(task, today)) occurrences.push({ task, scheduledAt });
  }
  occurrences.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  card.append(h("div", { class: "cardhead" },
    h("h2", {}, t("tasks.title")),
    h("span", { class: "spacer" }),
    h("button", { type: "button", class: "mini", title: t("tasks.manage"), "aria-label": t("tasks.manage"), html: icon("list", "sm"), onclick: openTaskManager })
  ));
  if (!occurrences.length) {
    card.append(h("p", { class: "muted" }, t("tasks.none")));
    card.append(h("button", { type: "button", class: "ghost", onclick: () => openTaskEdit(null) }, t("tasks.add")));
    return card;
  }
  const now = localInput(new Date());
  for (const occ of occurrences) {
    const check = taskCheckinFor(occ.task.id, occ.scheduledAt);
    const status = check ? check.status : "";
    const overdue = !status && occ.scheduledAt < now;
    const row = h("div", { class: "reminder" + (status ? ` ${status}` : overdue ? " overdue" : "") },
      h("span", { class: "qi", style: `--kc: ${occ.task.color || "var(--accent)"}`, html: icon(occ.task.icon || "bell", "sm") }),
      h("span", { class: "what" },
        h("span", { class: "main" }, occ.task.title),
        h("span", { class: "meta" },
          h("span", { class: "when" }, fmtClock(occ.scheduledAt)),
          status ? h("span", {}, t(`tasks.${status === "done" ? "done" : "skip"}`)) : overdue ? h("span", { class: "danger" }, t("tasks.overdue")) : null
        )
      ),
      h("span", { class: "row-actions" },
        h("button", { type: "button", class: "mini" + (status === "done" ? " on" : ""), title: t("tasks.done"), "aria-label": t("tasks.done"), html: icon("check", "sm"), onclick: () => setTaskCheckin(occ.task, occ.scheduledAt, status === "done" ? "pending" : "done") }),
        h("button", { type: "button", class: "mini" + (status === "skipped" ? " on" : ""), title: t("tasks.skip"), "aria-label": t("tasks.skip"), html: icon("x", "sm"), onclick: () => setTaskCheckin(occ.task, occ.scheduledAt, status === "skipped" ? "pending" : "skipped") })
      )
    );
    card.append(row);
  }
  return card;
}

function taskScheduleText(task) {
  const repeat = t(`tasks.${task.repeat || "daily"}`);
  const days = task.repeat === "weekly" && Array.isArray(task.days) && task.days.length ? ` ${task.days.map((d) => t(`tasks.weekdays.${d}`)).join(" ")}` : "";
  const times = (task.times || []).map((x) => x.slice(0, 5)).join(", ");
  return `${repeat}${days} · ${times || "—"}`;
}

function openTaskManager() {
  const body = $("taskBody");
  body.innerHTML = "";
  $("taskTitle").textContent = t("tasks.title");
  body.append(h("button", { type: "button", class: "primary", onclick: () => openTaskEdit(null) }, t("tasks.add")));
  for (const task of tasks) {
    body.append(h("div", { class: "taskrow" },
      h("span", { class: "qi", style: `--kc: ${task.color || "var(--accent)"}`, html: icon(task.icon || "bell", "sm") }),
      h("span", { class: "what" },
        h("span", { class: "main" }, task.title),
        h("span", { class: "meta" }, h("span", {}, taskScheduleText(task)), task.active ? null : h("span", { class: "muted" }, t("tasks.inactive")))
      ),
      h("span", { class: "row-actions" },
        h("button", { type: "button", class: "mini", title: t("edit"), html: icon("pencil", "sm"), onclick: () => openTaskEdit(task) }),
        h("button", { type: "button", class: "mini danger", title: t("delete"), html: icon("trash", "sm"), onclick: async () => {
          try { await api(`${API.tasks}/${task.id}`, { method: "DELETE" }); tasks = tasks.filter((x) => x.id !== task.id); openTaskManager(); renderToday(); } catch {}
        } })
      )
    ));
  }
  openSheet($("taskDialog"));
}

let taskDraft = null;
function draftFromTask(task = null) {
  return {
    id: task?.id || null,
    title: task?.title || "",
    detail: task?.detail || "",
    repeat: task?.repeat || "daily",
    days: Array.isArray(task?.days) ? task.days.slice() : [],
    times: Array.isArray(task?.times) ? task.times.slice() : ["08:00", "14:00", "20:00"],
    icon: task?.icon || "bell",
    color: task?.color || TASK_COLORS[0],
    active: task ? !!task.active : true,
    start_date: task?.start_date || isoDay(new Date()),
    end_date: task?.end_date || "",
    start_time: (task?.times || ["08:00"])[0] || "08:00",
    times_per_day: task?.times_per_day || (task?.times || [1]).length || 1,
    interval_minutes: task?.interval_minutes || 240,
    duration_minutes: task?.duration_minutes || 15,
  };
}

function generateDraftTimes() {
  const start = taskDraft.start_time || "08:00";
  const count = Math.max(1, Math.min(12, Number(taskDraft.times_per_day) || 1));
  const interval = Math.max(15, Math.min(1440, Number(taskDraft.interval_minutes) || 240));
  const [h0, m0] = start.split(":").map(Number);
  const out = [];
  for (let i = 0; i < count; i++) {
    const total = h0 * 60 + m0 + interval * i;
    if (total >= 24 * 60) break;
    out.push(`${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`);
  }
  taskDraft.times = out;
}

function renderTaskForm() {
  const body = $("taskEditBody");
  body.innerHTML = "";
  const field = (label, ...kids) => h("label", { class: "field" }, h("span", {}, label), ...kids);
  const input = (type, value, handler, attrs = {}, ev = "oninput") => h("input", { type, value, [ev]: handler, ...attrs });
  const seg = (options, value, onclick) => h("div", { class: "seg" }, ...options.map(([v, label]) => h("button", { type: "button", class: v === value ? "on" : "", onclick: () => onclick(v) }, label)));

  body.append(field(t("tasks.name"), input("text", taskDraft.title, (e) => { taskDraft.title = e.target.value; })));
  body.append(field(t("tasks.detail"), input("text", taskDraft.detail || "", (e) => { taskDraft.detail = e.target.value; })));
  const iconPicker = h("div", { class: "iconpicker" });
  for (const name of TASK_ICONS) {
    iconPicker.append(h("button", {
      type: "button", class: name === taskDraft.icon ? "on" : "", "aria-label": name, html: icon(name, "sm"),
      onclick: () => { taskDraft.icon = name; renderTaskForm(); }
    }));
  }
  body.append(h("div", { class: "field" }, h("span", {}, t("tasks.icon")), iconPicker));
  const colorPicker = h("div", { class: "colorpicker" });
  for (const color of TASK_COLORS) {
    colorPicker.append(h("button", {
      type: "button", class: color === taskDraft.color ? "on" : "", "aria-label": color, style: `--swatch: ${color}`,
      onclick: () => { taskDraft.color = color; renderTaskForm(); }
    }));
  }
  body.append(h("div", { class: "field" }, h("span", {}, t("tasks.color")), colorPicker));
  body.append(field(t("tasks.repeat"), seg([["daily", t("tasks.daily")], ["weekly", t("tasks.weekly")], ["monthly", t("tasks.monthly")]], taskDraft.repeat, (v) => { taskDraft.repeat = v; renderTaskForm(); })));
  if (taskDraft.repeat === "weekly") {
    body.append(h("div", { class: "field" }, h("span", {}, t("tasks.days")), h("div", { class: "daypicker" }, ...[0,1,2,3,4,5,6].map((d) => h("button", {
      type: "button", class: taskDraft.days.includes(d) ? "on" : "", onclick: () => {
        taskDraft.days = taskDraft.days.includes(d) ? taskDraft.days.filter((x) => x !== d) : [...taskDraft.days, d];
        renderTaskForm();
      }
    }, t(`tasks.weekdays.${d}`))))));
  }
  body.append(h("div", { class: "fieldgrid" },
    field(t("tasks.startTime"), input("time", taskDraft.start_time, (e) => { taskDraft.start_time = e.target.value; generateDraftTimes(); renderTaskForm(); }, {}, "onchange")),
    field(t("tasks.timesPerDay"), input("number", String(taskDraft.times_per_day), (e) => { taskDraft.times_per_day = Number(e.target.value) || 1; generateDraftTimes(); renderTaskForm(); }, { min: "1", max: "12" }, "onchange")),
    field(t("tasks.interval"), input("number", String(taskDraft.interval_minutes), (e) => { taskDraft.interval_minutes = Number(e.target.value) || 240; generateDraftTimes(); renderTaskForm(); }, { min: "15", max: "1440", step: "15" }, "onchange")),
    field(t("tasks.duration"), input("number", String(taskDraft.duration_minutes), (e) => { taskDraft.duration_minutes = Number(e.target.value) || 15; }, { min: "5", max: "180", step: "5" }, "onchange"))
  ));
  body.append(h("p", { class: "hint" }, `${t("tasks.preview")}: ${(taskDraft.times || []).join(", ") || "—"}`));
  body.append(h("div", { class: "fieldgrid" },
    field(t("tasks.startDate"), input("date", taskDraft.start_date || "", (e) => { taskDraft.start_date = e.target.value; })),
    field(t("tasks.endDate"), input("date", taskDraft.end_date || "", (e) => { taskDraft.end_date = e.target.value; }))
  ));
  body.append(field(t("tasks.active"), seg([["1", t("tasks.active")], ["0", t("tasks.inactive")]], taskDraft.active ? "1" : "0", (v) => { taskDraft.active = v === "1"; renderTaskForm(); })));
}

function openTaskEdit(task) {
  taskDraft = draftFromTask(task);
  $("taskEditTitle").textContent = task ? t("tasks.editTitle") : t("tasks.newTitle");
  $("taskEditDelete").classList.toggle("hidden", !task);
  $("taskEditDelete").innerHTML = icon("trash", "sm") + " " + t("delete");
  $("taskEditDelete").onclick = async () => {
    if (!taskDraft.id) return;
    try { await api(`${API.tasks}/${taskDraft.id}`, { method: "DELETE" }); tasks = tasks.filter((x) => x.id !== taskDraft.id); closeSheet($("taskEditDialog")); openTaskManager(); renderToday(); toast(t("tasks.deleted")); } catch {}
  };
  $("taskEditCancel").textContent = t("cancel");
  $("taskEditSave").textContent = t("save");
  renderTaskForm();
  openSheet($("taskEditDialog"));
}

async function submitTaskEdit(event) {
  event.preventDefault();
  generateDraftTimes();
  const body = {
    title: taskDraft.title, detail: taskDraft.detail, repeat: taskDraft.repeat, days: taskDraft.days,
    times: taskDraft.times, icon: taskDraft.icon, color: taskDraft.color, active: taskDraft.active,
    start_date: taskDraft.start_date || null, end_date: taskDraft.end_date || null,
    interval_minutes: taskDraft.interval_minutes, times_per_day: taskDraft.times_per_day, duration_minutes: taskDraft.duration_minutes,
  };
  const path = taskDraft.id ? `${API.tasks}/${taskDraft.id}` : API.tasks;
  const method = taskDraft.id ? "PUT" : "POST";
  try {
    const data = await api(path, { method, body: JSON.stringify(body) });
    if (taskDraft.id) tasks = tasks.map((x) => x.id === data.task.id ? data.task : x);
    else tasks.push(data.task);
    closeSheet($("taskEditDialog"));
    openTaskManager();
    renderToday();
    toast(t("tasks.saved"), { icon: data.task.icon || "bell" });
  } catch (error) {
    if (error.fields) {
      for (const [field, code] of Object.entries(error.fields)) {
        const label = document.querySelector(`#taskEditBody .field span`);
        if (label) label.textContent = `${t("tasks.name")}: ${t(`errors.${code}`)}`;
      }
    } else {
      enqueue({ path, method, body });
      closeSheet($("taskEditDialog"));
      showOffline();
    }
  }
}

function importantNoticesCard() {
  const card = h("section", { class: "card notice-card hidden" });
  let items = [];
  let rows = [];

  const paint = () => {
    const rank = { bad: 0, warn: 1, info: 2 };
    const grouped = new Map();
    for (const s of visibleSignals(items).filter((x) => x.sev !== "info").sort((a, b) => rank[a.sev] - rank[b.sev])) {
      const existing = grouped.get(s.key);
      if (!existing) grouped.set(s.key, { ...s, count: 1 });
      else {
        existing.count += 1;
        if (Number(s.params?.n) > Number(existing.params?.n)) existing.params = s.params;
      }
    }
    const important = [...grouped.values()].slice(0, NOTICE_PREVIEW);
    card.classList.toggle("hidden", !important.length);
    card.innerHTML = "";
    if (!important.length) return;
    card.append(h("div", { class: "cardhead" },
      h("h2", {}, t("notices.title")),
      h("span", { class: "spacer" }),
      ignoredButton(),
      h("button", { type: "button", class: "mini ghost wide", onclick: () => go("insights") }, t("notices.more")),
      h("button", { type: "button", class: "mini wide", onclick: () => go("kontrola") }, t("notices.review"))
    ));
    card.append(h("ul", { class: "notices" }, important.map((s) => {
      const text = `${signalText(s)}${s.count > 1 ? ` ×${s.count}` : ""}`;
      return signalListItem(s, text, rows, paint);
    })));
  };

  (async () => {
    if (!summary) return;
    const ctx = insightCtx();
    try {
      rows = await loadEntries({ from: ctx.days[0] ? ctx.days[0].date : null, limit: 5000 });
    } catch { /* offline: notices may be incomplete */ }
    items = analyzeSignals(rows, ctx.completed, ctx.ageDays, ctx.nowStamp).concat(thresholdSignals(rows, ctx));
    paint();
  })().catch(() => {});
  return card;
}

function renderToday() {
  const root = $("view-today");
  root.innerHTML = "";
  const today = summary ? summary.today : null;

  const quick = h("section", { class: "card" },
    h("div", { class: "cardhead" },
      h("h2", {}, t("quickTitle")),
      h("span", { class: "spacer" }),
      h("div", { class: "seg" }, ...(meta ? meta.users : []).map((name) => h("button", {
        type: "button", class: name === user ? "on" : "", "data-user": name,
        onclick: () => { user = name; localStorage.setItem("baby.user", user); renderToday(); },
      }, uLabel(name))))
    ),
    shortcutGrid(),
    h("div", { class: "cardhead", style: "margin-top:14px" }, h("h2", {}, t("addTitle"))),
    quickGrid()
  );

  const right = h("div", { class: "view", style: "gap:14px" });
  right.append(statsCard(today));
  right.append(nextFeedCard());
  right.append(lastEventsCard());

  root.append(...(meta && meta.setup_needed ? [setupCard()] : []), importantNoticesCard(), remindersCard(), quick, right);
}

function quickGrid() {
  const grid = h("div", { class: "quickgrid" });
  for (const kind of KIND_ORDER) {
    const tile = h("button", {
      type: "button", class: "qtile", "data-quick": kind, style: kindColorVar(kind),
      onclick: () => openEntryDialog(kind),
    },
      h("span", { class: "qi", html: icon(KIND_ICONS[kind]) }),
      h("span", { class: "qt" }, h("b", {}, t(`kinds.${kind}`)), h("small", {}, t(`kind_sub.${kind}`)))
    );
    grid.append(tile);
  }
  return grid;
}

function quickActionIcon(kind) {
  return h("span", { class: "qi quick", html: icon(KIND_ICONS[kind] || "play", "sm") + `<span class="playbadge">${icon("play", "xs")}</span>` });
}

const DIAPER_COLORS = { wet: "var(--k-diaper)", dirty: "var(--danger)", mixed: "var(--mixed)" };

function qLabel(id) {
  if (isQGap(id)) return t("settings.qkGap");
  if (isQGrp(id)) { const g = quickGroups().find((x) => `g:${x.uid}` === id); return g ? g.name || t("settings.qkGroupPh") : id; }
  if (id.startsWith("feed:")) return t(`quick_feed_methods.${id.slice(5)}`);
  const s = T_START.find(([k]) => `timer:${k}` === id);
  if (s) return t(s[1]);
  if (id === "measure:temp") return t("qkTemp");
  if (id.startsWith("diaper:")) return t(`diaper_types.${id.slice(7)}`);
  const def = quickDefs().find((x) => x.uid === id);
  return def ? `${def.name}${def.dose ? ` · ${def.dose}` : ""}` : id;
}
function qPill(id) {
  if (isQGap(id) || isQGrp(id)) return "";
  if (id.startsWith("feed:")) return t("kinds.feed");
  if (id.startsWith("timer:")) return t(`kinds.${id.slice(6)}`);
  if (id === "measure:temp") return t("kinds.measure");
  if (id.startsWith("diaper:")) return t("kinds.diaper");
  const def = quickDefs().find((x) => x.uid === id);
  return t(def && def.type === "act" ? "kinds.activity" : "kinds.medication");
}

function shortcutTile(id) {
  if (id.startsWith("feed:")) {
    const method = id.slice(5);
    return h("button", {
      type: "button", class: "tbtn", style: kindColorVar("feed"), "data-quick-id": id, "data-timer": `feed:${method}`,
      onclick: () => startTimer("feed", method),
    }, quickActionIcon("feed"), t(`quick_feed_methods.${method}`));
  }
  const startEntry = id.startsWith("timer:") ? T_START.find(([k]) => k === id.slice(6)) : null;
  if (startEntry) {
    const kind = startEntry[0];
    return h("button", {
      type: "button", class: "tbtn", style: kindColorVar(kind), "data-quick-id": id, "data-timer": kind,
      onclick: () => startTimer(kind),
    }, quickActionIcon(kind), t(startEntry[1]));
  }
  if (id === "measure:temp") {
    return h("button", {
      type: "button", class: "tbtn", style: kindColorVar("measure"), "data-quick-id": id,
      onclick: quickMeasureTemp,
    }, h("span", { class: "qi", html: icon("scale", "sm") }), t("qkTemp"));
  }
  if (id.startsWith("diaper:")) {
    const type = id.slice(7);
    return h("button", {
      type: "button", class: "tbtn", style: `--kc: ${DIAPER_COLORS[type]}`, "data-quick-id": id, "data-quick-fast": type,
      onclick: () => quickDiaper(type),
    }, h("span", { class: "qi", html: icon("diaper", "sm") }), t(`diaper_types.${type}`));
  }
  const def = quickDefs().find((x) => x.uid === id);
  if (!def) return null;
  return h("button", {
    type: "button", class: "tbtn", style: kindColorVar(def.type === "med" ? "medication" : "activity"),
    "data-quick-id": id, "data-quick-custom": def.type,
    onclick: () => (def.type === "med" ? quickMed : def.pausable ? startActTimer : quickAct)(def),
  }, h("span", { class: "qi", html: icon(def.icon || (def.type === "med" ? "pill" : "star"), "sm") }), `${def.name}${def.dose ? ` · ${def.dose}` : ""}`);
}

function shortcutGrid() {
  const row = h("div", { class: "timerrow2" });
  for (const id of quickOrder()) {
    if (!qOn(id)) continue;
    if (isQGap(id)) { row.append(h("span", { class: "qgap", "data-quick-id": id })); continue; }
    if (isQGrp(id)) {
      const g = quickGroups().find((x) => `g:${x.uid}` === id);
      if (g && g.name) row.append(h("div", { class: "qgroup", "data-quick-id": id }, g.name));
      continue;
    }
    const tile = shortcutTile(id);
    if (tile) row.append(tile);
  }
  return row;
}

function statsCard(today) {
  const num = (v) => Number(v) || 0;
  const weights = (summary && summary.weights) || [];
  const last = weights[weights.length - 1];
  const first = weights[0];
  const delta = last && first ? Math.round((last.value - first.value) * 10) / 10 : null;
  const care = ["walks", "baths", "medications", "activities"].map((k) => num(today && today[k])).reduce((a, b) => a + b, 0);
  const stats = [
    { label: t("stat.nappies"), value: `${num(today && today.wet) + num(today && today.dirty) + num(today && today.mixed)}`, sub: `${t("table.wet")} ${num(today && today.wet)} · ${t("table.dirty")} ${num(today && today.dirty)}`, hero: true },
    { label: t("stat.feeds"), value: String(num(today && today.feeds)), sub: `${num(today && today.feed_minutes)} min${num(today && today.feed_ml) ? ` · ${num(today && today.feed_ml)} ml` : ""}`, hero: true },
    { label: t("stat.sleep"), value: `${(num(today && today.sleep_minutes) / 60).toFixed(1)} h`, sub: `${num(today && today.sleep_minutes)} min`, hero: true },
    { label: t("stat.care"), value: String(care), sub: "" },
    { label: t("stat.weight"), value: last ? `${last.value} g` : "—", sub: delta !== null ? `${delta > 0 ? "+" : ""}${delta} g` : "" },
    { label: t("stat.notes"), value: String(num(today && today.notes)), sub: "" },
  ];
  return h("section", { class: "card" },
    h("div", { class: "cardhead" }, h("h2", {}, `${t("summaryTitle")} · ${today ? today.date.slice(5) : ""}`)),
    h("div", { class: "stats" }, ...stats.map((s) => h("div", { class: "stat" + (s.hero ? " hero" : "") },
      h("b", {}, s.value), h("span", {}, s.label), s.sub ? h("small", { class: "muted" }, s.sub) : null)))
  );
}

function nextFeedCard() {
  const card = h("section", { class: "card" });
  if (!lastFeedAt) {
    card.append(h("div", { class: "nextfeed" }, h("span", { html: icon("clock", "sm") }), h("span", { class: "muted" }, t("noData"))));
    return card;
  }
  const mins = minutesBetween(lastFeedAt, localInput(new Date()));
  const remind = reminderSettings();
  const due = mins !== null && mins >= remind.minutes;
  const box = h("div", { class: "nextfeed" + (due ? " due" : "") },
    h("span", { html: icon("bottle", "sm") }),
    h("span", {}, `${t("nextFeed")} ${fmtClock(lastFeedAt)} · ${mins} min ${t("nextFeedAgo")}`),
    h("span", { class: "spacer" }),
    due ? h("b", {}, t("nextFeedDue")) : h("span", { class: "muted" }, `${t("nextFeedIn")} ${remind.minutes - mins} min`)
  );
  card.append(box);
  return card;
}

function lastEventsCard() {
  const card = h("section", { class: "card" }, h("div", { class: "cardhead" }, h("h2", {}, t("lastEvents"))));
  loadEntries({ from: isoDay(new Date()), limit: 7 }).then((rows) => {
    if (!rows.length) card.append(h("p", { class: "muted" }, t("empty")));
    for (const entry of rows) card.append(entryRow(entry, { compact: true }));
  }).catch(() => card.append(h("p", { class: "muted" }, t("errors.network"))));
  return card;
}

/* ---------- entry rows ---------- */

function entryText(entry) {
  const bits = [];
  if (entry.kind === "diaper") {
    bits.push(entry.diaper_type ? t(`diaper_types.${entry.diaper_type}`) : t("kinds.diaper"));
    if (entry.diaper_colour) bits.push(t(`diaper_colours.${entry.diaper_colour}`));
  } else if (entry.kind === "feed") {
    const running = entry.timer && !entry.end_at;
    if (running) bits.push(`${t("feedRunning")} ${fmtClock(entry.at)}`);
    if (entry.feed_method) bits.push(t(`feed_methods.${entry.feed_method}`));
    else if (!running) bits.push(t("kinds.feed"));
    if (!running) {
      if (entry.end_at) bits.push(`${fmtClock(entry.at)} → ${fmtClock(entry.end_at)} (${durLabel(entry)})`);
      else if (entry.feed_minutes) bits.push(`${entry.feed_minutes} min`);
    }
    if (entry.feed_ml) bits.push(`${entry.feed_ml} ml`);
    if (entry.swallows !== null && entry.swallows !== undefined) bits.push(`${entry.swallows}× 🤏`);
  } else if (entry.kind === "sleep") {
    if (entry.end_at) bits.push(`${fmtClock(entry.at)} → ${fmtClock(entry.end_at)} (${durLabel(entry)})`);
    else bits.push(t("sleepRunning"));
  } else if (entry.kind === "walk" || entry.kind === "bath" || entry.kind === "activity") {
    const running = entry.timer && !entry.end_at;
    if (running) bits.push(t(`${entry.kind}Running`) + (entry.paused_at ? ` · ${t("pausedTag")}` : ""));
    else if (entry.activity) bits.push(entry.activity);
    else bits.push(t(`kinds.${entry.kind}`));
    if (!running && entry.end_at) bits.push(`${fmtClock(entry.at)} → ${fmtClock(entry.end_at)} (${durLabel(entry)})`);
  } else if (entry.kind === "medication") {
    bits.push(entry.med_name || t("kinds.medication"));
    if (entry.dose) bits.push(entry.dose);
  } else if (entry.kind === "task") {
    bits.push(entry.activity || t("kinds.task"));
  } else if (entry.kind === "measure") {
    const suffix = { weight_g: " g", temp_c: " °C", vitd_iu: " IU" }[entry.measure_kind] || "";
    bits.push(`${entry.value}${suffix}`);
  } else if (entry.kind === "note") {
    bits.push(entry.note || "");
  }
  if (!bits.length) bits.push(t(`kinds.${entry.kind}`));
  return bits.join(" · ");
}

function entryMeta(entry) {
  const bits = [];
  if (entry.kind === "measure") bits.push(t(`measure_kinds.${entry.measure_kind}`));
  if (entry.note && entry.kind !== "note") bits.push(entry.note);
  if (entry.updated) bits.push(`✎ ${entry.updated.slice(0, 16).replace("T", " ")}`);
  return bits;
}

function entryRow(entry, { compact = false } = {}) {
  const row = h("div", { class: "entry", "data-entry": String(entry.id) },
    h("span", { class: "ei", style: kindColorVar(entry.kind), html: icon(KIND_ICONS[entry.kind], "sm") }),
    h("span", { class: "what" },
      h("span", { class: "main" }, entryText(entry)),
      h("span", { class: "meta" },
        h("span", { class: "when" }, fmtClock(entry.at)),
        h("span", { class: "who" + userColorClass(entry.user) }, uLabel(entry.user)),
        ...entryMeta(entry).map((b) => h("span", {}, b))
      )
    ),
    h("span", { class: "row-actions" },
      h("button", { type: "button", class: "mini", title: t("edit"), "data-edit": String(entry.id), html: icon("pencil", "sm"), onclick: () => openEntryDialog(entry.kind, entry) }),
      h("button", { type: "button", class: "mini danger", title: t("delete"), html: icon("trash", "sm"), onclick: (ev) => confirmDeleteRow(ev, entry) })
    )
  );
  return row;
}

function confirmDeleteRow(event, entry) {
  const btn = event.currentTarget;
  if (btn.dataset.armed) { deleteEntry(entry, btn.closest(".entry")); return; }
  btn.dataset.armed = "1";
  btn.innerHTML = icon("trash", "sm");
  btn.classList.add("danger");
  toast(t("confirmDelete2"), {
    icon: "trash", err: true, ms: 3000, actionLabel: t("delete"),
    action: () => deleteEntry(entry),
  });
  setTimeout(() => { delete btn.dataset.armed; }, 3000);
}

async function deleteEntry(entry, rowEl) {
  try { await api(`${API.entries}/${entry.id}`, { method: "DELETE" }); }
  catch (error) { if (!error.status) enqueue({ path: `${API.entries}/${entry.id}`, method: "DELETE", body: {} }); }
  if (rowEl && document.body.dataset.anim === "on") {
    leaveNode(rowEl);
    setTimeout(refresh, 170);
  } else await refresh();
}

/* ---------- log view ---------- */

function renderLog() {
  const root = $("view-log");
  root.innerHTML = "";
  logOffset = 0;

  const ranges = [["today", t("today")], ["week", t("week")], ["all", t("filters.all")]];
  const head = h("div", { class: "card" },
    h("div", { class: "cardhead" },
      h("h2", {}, t("entriesTitle")),
      h("span", { class: "spacer" }),
      h("div", { class: "seg" }, ...ranges.map(([key, label]) => h("button", {
        type: "button", "data-range": key, class: logRange === key ? "on" : "",
        onclick: () => { logRange = key; renderLog(); },
      }, label)))
    ),
    h("div", { class: "flabel" }, t("filters.kind")),
    h("div", { class: "chips" },
      h("button", { type: "button", class: "chip" + (!filterKind ? " on" : ""), onclick: () => { filterKind = ""; localStorage.setItem("baby.fkind", ""); renderLog(); } }, t("filters.all")),
      ...KIND_ORDER.map((kind) => h("button", {
        type: "button", class: "chip" + (filterKind === kind ? " on" : ""), style: kindColorVar(kind),
        onclick: () => { filterKind = kind; localStorage.setItem("baby.fkind", kind); renderLog(); },
      }, h("span", { class: "dot" }), t(`kinds.${kind}`)))
    ),
    h("div", { class: "flabel", style: "margin-top:10px" }, t("filters.user")),
    h("div", { class: "chips" },
      h("button", { type: "button", class: "chip" + (!filterUser ? " on" : ""), onclick: () => { filterUser = ""; renderLog(); } }, t("filters.all")),
      ...(meta ? meta.users : []).map((name) => h("button", {
        type: "button", class: "chip" + (filterUser === name ? " on" : ""),
        onclick: () => { filterUser = name; renderLog(); },
      }, uLabel(name)))
    )
  );

  const list = h("section", { class: "card pad0", style: "padding:6px 12px" });
  const more = h("div", { class: "loadmore" });
  root.append(head, list, more);
  fillLog(list, more);
}

function logFromDay() {
  if (logRange === "today") return isoDay(new Date());
  if (logRange === "week") return isoDay(new Date(Date.now() - 6 * 864e5));
  return null;
}

async function fillLog(list, more) {
  list.innerHTML = "";
  more.innerHTML = "";
  let rows;
  try {
    rows = await loadEntries({ from: logFromDay(), kind: filterKind, user: filterUser, limit: logOffset + LOG_PAGE });
  } catch {
    list.append(h("p", { class: "muted" }, t("errors.network")));
    return;
  }
  const slice = rows.slice(0, logOffset + LOG_PAGE);
  if (!slice.length) { list.append(h("p", { class: "muted" }, t("empty"))); highlightJumpDay(list); return; }
  let lastDay = null;
  for (const entry of slice) {
    const day = entry.at.slice(0, 10);
    if (day !== lastDay) {
      lastDay = day;
      list.append(h("div", { class: "dayhead", "data-day": day }, h("b", {}, dayName(day))));
    }
    list.append(entryRow(entry));
  }
  highlightJumpDay(list);
  if (rows.length >= logOffset + LOG_PAGE) {
    more.append(h("button", {
      type: "button", class: "ghost", onclick: () => { logOffset += LOG_PAGE; fillLog(list, more); },
    }, t("loadMore")));
  }
}

function highlightJumpDay(list) {
  const wanted = jumpDay;
  if (!wanted) return;
  jumpDay = null;
  let target = list.querySelector(`[data-day="${CSS.escape(wanted)}"]`);
  if (!target) {
    const placeholder = h("div", { class: "dayhead jumpmissing", "data-day": wanted }, h("b", {}, dayName(wanted)), h("span", { class: "muted" }, ` — ${t("notices.dayNoEntries")}`));
    const before = [...list.querySelectorAll("[data-day]")].find((hd) => hd.dataset.day < wanted);
    if (before) list.insertBefore(placeholder, before);
    else list.append(placeholder);
    target = placeholder;
  }
  target.classList.add("flash");
  target.scrollIntoView({ block: "start", behavior: "smooth" });
  setTimeout(() => { if (target.isConnected) target.classList.remove("flash"); }, 1800);
}

/* ---------- stats view ---------- */

function renderStats() {
  const root = $("view-stats");
  root.innerHTML = "";
  const ranges = [[7, t("week")], [14, t("days14")], [30, t("days30")]];
  const chartCard = h("section", { class: "card" },
    h("div", { class: "cardhead" },
      h("h2", {}, t("statsTitle")),
      h("span", { class: "spacer" }),
      h("div", { class: "seg" }, ...ranges.map(([n, label]) => h("button", {
        type: "button", class: statsDays === n ? "on" : "",
        onclick: () => { statsDays = n; localStorage.setItem("baby.statsdays", String(n)); loadSummary().then(renderStats).catch(() => {}); },
      }, label)))
    ),
    h("div", { class: "chips" }, ...CHART_TABS.map((tab) => h("button", {
      type: "button", class: "chip" + (tab === chartTab ? " on" : ""), "data-chart": tab,
      onclick: () => { chartTab = tab; localStorage.setItem("baby.chart", tab); renderStats(); },
    }, t(`chart.${tab}`)))),
    h("div", { class: "chartwrap", id: "chartArea" })
  );

  const tableCard = h("section", { class: "card" },
    h("div", { class: "cardhead" }, h("h2", {}, t("tableTitle"))),
    h("div", { class: "tablewrap", id: "tableArea" })
  );

  root.append(chartCard, tableCard);
  drawChart();
  drawTable();
}

const CW = 720, CH = 300, CM = 18, CTOP = 32, CBASE = 244, CPLOT = CBASE - CTOP, CLAB = 266;

function niceMax(v) {
  if (v <= 5) return 5;
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  if (v <= 30) return 30;
  if (v <= 50) return 50;
  if (v <= 100) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

function fmtNum(v) {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function chartFrame(label) {
  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${String(label).replace(/"/g, "&quot;")}">`;
}

function barPos(index, count) {
  const group = (CW - 2 * CM) / Math.max(count, 1);
  const width = Math.min(56, Math.max(10, group * 0.62));
  return { x: CM + index * group + (group - width) / 2, width, group };
}

function gridLines(max) {
  let out = "";
  for (let i = 1; i <= 4; i++) {
    const y = CBASE - (CPLOT * i) / 4;
    out += `<line class="grid" x1="${CM}" y1="${y.toFixed(1)}" x2="${CW - CM}" y2="${y.toFixed(1)}"/>`;
    out += `<text x="${CM}" y="${(y - 4).toFixed(1)}">${fmtNum((max * i) / 4)}</text>`;
  }
  return out;
}

function dayLabels(days) {
  const every = days.length > 14 ? 5 : days.length > 8 ? 2 : 1;
  let out = "";
  days.forEach((day, index) => {
    if (index % every !== 0 && index !== days.length - 1) return;
    const pos = barPos(index, days.length);
    const label = days.length > 14 ? day.date.slice(8) : day.date.slice(5);
    out += `<text x="${(pos.x + pos.width / 2).toFixed(1)}" y="${CLAB}" text-anchor="middle">${label}</text>`;
  });
  return out;
}

function drawChart() {
  const area = $("chartArea");
  if (!area || !summary) return;
  const days = summary.days.slice(-statsDays);
  const total = (fn) => days.reduce((acc, d) => acc + (Number(fn(d)) || 0), 0);
  let body = "", foot = "";

  if (chartTab === "output") {
    const totals = days.map((d) => (d.wet || 0) + (d.dirty || 0) + (d.mixed || 0));
    if (!total(() => 1) || !totals.some((v) => v)) { area.innerHTML = `<p class="muted">${t("noData")}</p>`; return; }
    const max = niceMax(Math.max(...totals));
    body = gridLines(max);
    days.forEach((day, index) => {
      const pos = barPos(index, days.length);
      let cursor = CBASE, topY = CBASE;
      for (const series of [{ cls: "wet", v: day.wet || 0 }, { cls: "dirty", v: day.dirty || 0 }, { cls: "mixed", v: day.mixed || 0 }]) {
        if (series.v > 0) {
          const height = Math.max(2, (series.v / max) * CPLOT);
          const y = cursor - height;
          body += `<rect class="bar ${series.cls}" rx="3" x="${pos.x.toFixed(1)}" y="${y.toFixed(1)}" width="${pos.width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
          cursor = y; topY = y;
        }
      }
      if (totals[index]) body += `<text class="count" x="${(pos.x + pos.width / 2).toFixed(1)}" y="${Math.max(CTOP - 8, topY - 6).toFixed(1)}" text-anchor="middle">${totals[index]}</text>`;
    });
    body += dayLabels(days);
    const wet = total((d) => d.wet), dirty = total((d) => d.dirty), mixed = total((d) => d.mixed);
    foot = `<p class="legend"><span><span class="dot wet"></span>${t("diaper_types.wet")} ${wet}</span><span><span class="dot dirty"></span>${t("diaper_types.dirty")} ${dirty}</span><span><span class="dot mixed"></span>${t("diaper_types.mixed")} ${mixed}</span></p>`;
  } else if (chartTab === "feeds") {
    const values = days.map((d) => d.feeds || 0);
    if (!values.some((v) => v)) { area.innerHTML = `<p class="muted">${t("noData")}</p>`; return; }
    const max = niceMax(Math.max(...values));
    body = gridLines(max);
    days.forEach((day, index) => {
      const pos = barPos(index, days.length);
      if (day.feeds) {
        const height = Math.max(2, (day.feeds / max) * CPLOT);
        const y = CBASE - height;
        body += `<rect class="bar feed" rx="3" x="${pos.x.toFixed(1)}" y="${y.toFixed(1)}" width="${pos.width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
        body += `<text class="count" x="${(pos.x + pos.width / 2).toFixed(1)}" y="${Math.max(CTOP - 8, y - 6).toFixed(1)}" text-anchor="middle">${day.feeds}</text>`;
      }
    });
    body += dayLabels(days);
    const minutes = Math.round(total((d) => d.feed_minutes));
    const ml = Math.round(total((d) => d.feed_ml));
    foot = `<p class="legend"><span><span class="dot feed"></span>${t("table.feeds")} ${total((d) => d.feeds)}</span><span>${minutes} min${ml ? ` · ${ml} ml` : ""}</span></p>`;
  } else if (chartTab === "sleep") {
    const hours = days.map((d) => (Number(d.sleep_minutes) || 0) / 60);
    if (!hours.some((v) => v)) { area.innerHTML = `<p class="muted">${t("noData")}</p>`; return; }
    const max = niceMax(Math.max(...hours));
    body = gridLines(max);
    days.forEach((day, index) => {
      const pos = barPos(index, days.length);
      if (hours[index] > 0) {
        const height = Math.max(2, (hours[index] / max) * CPLOT);
        const y = CBASE - height;
        body += `<rect class="bar sleep" rx="3" x="${pos.x.toFixed(1)}" y="${y.toFixed(1)}" width="${pos.width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
        body += `<text class="count" x="${(pos.x + pos.width / 2).toFixed(1)}" y="${Math.max(CTOP - 8, y - 6).toFixed(1)}" text-anchor="middle">${fmtNum(hours[index])}</text>`;
      }
    });
    body += dayLabels(days);
    foot = `<p class="legend"><span><span class="dot sleep"></span>${t("table.sleep")} ${total((d) => d.sleep_minutes / 60).toFixed(1)} h</span></p>`;
  } else if (chartTab === "care") {
    const values = days.map((d) => (d.walks || 0) + (d.baths || 0) + (d.medications || 0) + (d.activities || 0));
    if (!values.some((v) => v)) { area.innerHTML = `<p class="muted">${t("noData")}</p>`; return; }
    const max = niceMax(Math.max(...values));
    body = gridLines(max);
    days.forEach((day, index) => {
      const pos = barPos(index, days.length);
      if (values[index]) {
        const height = Math.max(2, (values[index] / max) * CPLOT);
        const y = CBASE - height;
        body += `<rect class="bar care" rx="3" x="${pos.x.toFixed(1)}" y="${y.toFixed(1)}" width="${pos.width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
        body += `<text class="count" x="${(pos.x + pos.width / 2).toFixed(1)}" y="${Math.max(CTOP - 8, y - 6).toFixed(1)}" text-anchor="middle">${values[index]}</text>`;
      }
    });
    body += dayLabels(days);
    foot = `<p class="legend"><span><span class="dot care"></span>${t("kinds.walk")} ${total((d) => d.walks)} · ${t("kinds.bath")} ${total((d) => d.baths)} · ${t("kinds.medication")} ${total((d) => d.medications)} · ${t("kinds.activity")} ${total((d) => d.activities)}</span></p>`;
  } else {
    const points = days.map((d, i) => ({ i, v: d.weight_g })).filter((p) => Number.isFinite(p.v));
    if (points.length < 1) { area.innerHTML = `<p class="muted">${t("noData")}</p>`; return; }
    const values = points.map((p) => p.v);
    const minV = Math.min(...values), maxV = Math.max(...values);
    const span = maxV - minV;
    const low = span === 0 ? minV - 25 : minV - span * 0.3;
    const high = span === 0 ? maxV + 25 : maxV + span * 0.3;
    const scale = (v) => CTOP + ((high - v) / Math.max(high - low, 1)) * CPLOT;
    const group = (CW - 2 * CM) / Math.max(days.length, 1);
    const px = (i) => CM + (i + 0.5) * group;
    body = `<line class="axis" x1="${CM}" y1="${CBASE}" x2="${CW - CM}" y2="${CBASE}"/>`;
    if (points.length > 1) {
      const line = points.map((p) => `${px(p.i).toFixed(1)},${scale(p.v).toFixed(1)}`).join(" ");
      body += `<polygon class="area" points="${CM},${CBASE} ${line} ${(CW - CM).toFixed(1)},${CBASE}"/>`;
      body += `<polyline class="line" points="${line}"/>`;
    }
    for (const p of points) {
      body += `<circle class="point" cx="${px(p.i).toFixed(1)}" cy="${scale(p.v).toFixed(1)}" r="4.5"/>`;
      body += `<text class="count" x="${px(p.i).toFixed(1)}" y="${Math.max(CTOP - 8, scale(p.v) - 10).toFixed(1)}" text-anchor="middle">${fmtNum(p.v)}</text>`;
    }
    body += dayLabels(days);
    const delta = Math.round((values[values.length - 1] - values[0]) * 10) / 10;
    foot = `<p class="legend"><span>${points.length}× · ${fmtNum(minV)}–${fmtNum(maxV)} g${delta ? ` · Δ ${delta > 0 ? "+" : ""}${fmtNum(delta)} g` : ""}</span></p>`;
  }
  area.innerHTML = chartFrame(t(`chart.${chartTab}`)) + body + "</svg>" + foot;
}

function drawTable() {
  const area = $("tableArea");
  if (!area || !summary) return;
  const days = summary.days.slice(-statsDays).slice().reverse();
  area.innerHTML = `<table><thead><tr>
    <th>${t("table.date")}</th><th>${t("table.wet")}</th><th>${t("table.dirty")}</th>
    <th>${t("table.feeds")}</th><th>${t("table.sleep")}</th><th>${t("table.weight")}</th>
  </tr></thead><tbody>${days.map((d) => `<tr>
    <td>${d.date.slice(5)}</td><td>${d.wet + d.mixed}</td><td>${d.dirty + d.mixed}</td>
    <td>${d.feeds}<span class="muted"> ${Math.round(d.feed_minutes)}′</span></td>
    <td>${(d.sleep_minutes / 60).toFixed(1)}</td><td>${d.weight_g ?? ""}</td></tr>`).join("")}</tbody></table>`;
}

/* ---------- insights view ---------- */

function trendFilterSetting() {
  return localStorage.getItem("baby.trendFilter") || "auto";
}

function reminderSettings() {
  const raw = JSON.parse(localStorage.getItem("baby.remind") || "null");
  return { on: !!(raw && raw.on), minutes: Math.max(30, Math.min(360, (raw && raw.minutes) || 180)) };
}

/* ---------- dismissed & acknowledged warnings ----------
   Hidden from the Today and Tips overviews but never deleted. Two flavours:
   - hide (×): one specific signal, no explanation;
   - acknowledge (✓): optionally with a reason, and either just this occurrence or a
     time-boxed rule that suppresses similar signals of the same kind – e.g. we let the
     baby sleep through a long feed gap on purpose, so gaps up to that length stay quiet.
    Every item keeps a text snapshot in localStorage; per device, not synced to the server. */

const DISMISS_KEY = "baby.dismissed";
let signalsExpanded = false;

function dismissedList() {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
    const now = localInput(new Date());
    return (Array.isArray(raw) ? raw : [])
      .filter((x) => x && typeof x.sid === "string")
      .filter((x) => !(x.kind === "ack" && x.rule && x.rule.until && x.rule.until < now)); // expired rules fall away
  } catch { return []; }
}

function dismissedCount() { return dismissedList().length; }

function isDismissed(sid) {
  if (!sid) return false;
  return dismissedList().some((x) => x.sid === sid);
}

function dismissItem(item, text) {
  if (!item.sid) return;
  const list = dismissedList().filter((x) => x.sid !== item.sid);
  list.unshift({ sid: item.sid, sev: item.sev || "info", text: text || item.sid, at: localInput(new Date()), kind: "hide" });
  localStorage.setItem(DISMISS_KEY, JSON.stringify(list.slice(0, 400)));
}

function restoreItem(sid) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissedList().filter((x) => x.sid !== sid)));
}

function restoreAllItems() { localStorage.removeItem(DISMISS_KEY); }

function ackExpiry(days) { return localInput(new Date(Date.now() + days * 864e5)); }

function acknowledgeSignal(sig, text, scope, days, reason) {
  const at = localInput(new Date());
  const clean = String(reason || "").trim().slice(0, 160);
  const entry = { sid: sig.sid || `ack|${sig.key}|${at}`, sev: sig.sev || "info", text: text || sig.sid, at, kind: "ack" };
  if (clean) entry.reason = clean;
  if (scope === "rule") {
    const n = Number(sig.params && sig.params.n);
    // cap the rule at the value we are acknowledging now; larger signals still alert
    entry.rule = { key: sig.key, maxN: Number.isFinite(n) ? n : null, until: days > 0 ? ackExpiry(days) : null };
  }
  const list = dismissedList().filter((x) => x.sid !== entry.sid);
  list.unshift(entry);
  localStorage.setItem(DISMISS_KEY, JSON.stringify(list.slice(0, 400)));
  return entry.sid;
}

function activeAckRules() { return dismissedList().filter((x) => x.kind === "ack" && x.rule && typeof x.rule.key === "string"); }

function ackRuleCovers(rule, sig) {
  if (rule.key !== sig.key) return false;
  if (rule.maxN == null) return true;
  const n = Number(sig.params && sig.params.n);
  return Number.isFinite(n) && n <= rule.maxN;
}

function coveredByAckRule(sig) { return activeAckRules().some((r) => ackRuleCovers(r.rule, sig)); }

function signalText(sig) {
  const titleKey = sig.key.endsWith("Title") ? sig.key : `${sig.key}Title`;
  return `${t(`insights.${titleKey}`)}: ${t(`insights.${titleKey.replace(/Title$/, "Text")}`, sig.params)}`;
}

function visibleSignals(signals) { return signals.filter((s) => !isDismissed(s.sid) && !coveredByAckRule(s)); }

/* Signal sids are `key|ref` where ref is an entry id, two entry ids, or a date
   (window-scoped refs like `2026-01-05..2026-01-19` have no single source). */
function signalSourceRef(sid) {
  const tail = String(sid || "").split("|").slice(1).join("|");
  if (!tail || tail.includes("..")) return { ids: [], days: [] };
  if (/^\d+$/.test(tail)) return { ids: [Number(tail)], days: [] };
  if (/^\d+-\d+$/.test(tail)) return { ids: tail.split("-").map(Number), days: [] };
  const days = tail.match(/\d{4}-\d{2}-\d{2}/g);
  return { ids: [], days: days || [] };
}

function gotoSignalSource(sig, rows) {
  const ref = signalSourceRef(sig.sid);
  for (const id of ref.ids) {
    const entry = (rows || []).find((r) => Number(r.id) === id);
    if (entry) { openEntryDialog(entry.kind, entry); return; }
  }
  if (ref.days.length) { jumpDay = ref.days[0]; logRange = "all"; go("log"); }
}

function sourceButton(sig, rows) {
  const ref = signalSourceRef(sig.sid);
  if (!ref.ids.length && !ref.days.length) return null;
  return h("button", {
    type: "button", class: "mini ghost", "data-act": "source", title: t("notices.openSource"), "aria-label": t("notices.openSource"),
    html: icon("pencil", "sm"),
    onclick: () => gotoSignalSource(sig, rows),
  });
}

function signalListItem(s, text, rows, onPainted) {
  const ref = signalSourceRef(s.sid);
  const canJump = ref.ids.length > 0 || ref.days.length > 0;
  return h("li", { class: s.sev + (canJump ? " jumpable" : ""), onclick: canJump ? () => gotoSignalSource(s, rows) : null },
    h("span", { class: "stext" }, text),
    h("span", { class: "sact", onclick: (e) => e.stopPropagation() }, sourceButton(s, rows), ackButton(s, text, onPainted), dismissButton(s, text, onPainted))
  );
}

/* ---------- kontrola: diff-style reconciliation of suspicious entries ---------- */

const kontrolaExpanded = new Set();

function plusStampLocal(stamp, minutes) {
  const d = new Date(stamp);
  d.setMinutes(d.getMinutes() + minutes);
  return localInput(d);
}

async function applyEntryPatch(entry, patch) {
  const path = `${API.entries}/${entry.id}`;
  try { await api(path, { method: "PUT", body: JSON.stringify(patch) }); }
  catch (error) { if (!error.status) enqueue({ path, method: "PUT", body: patch }); else throw error; }
  toast(t("kontrola.fixed"), { icon: "check" });
  await refresh();
}

function kontrolaPlan(s, rows, ctx) {
  const ref = signalSourceRef(s.sid);
  const entries = ref.ids.map((id) => rows.find((r) => Number(r.id) === id)).filter(Boolean);
  if (!entries.length && ref.days.length) {
    const m = findMeasure(rows, "weight_g", ref.days[ref.days.length - 1]);
    if (m) entries.push(m);
  }
  const e0 = entries[0], e1 = entries[1];
  const plan = { entries, dayKey: null, fields: [], actions: [] };
  if (entries.length) plan.dayKey = entries[entries.length - 1].at.slice(0, 10);
  else if (ref.days.length) plan.dayKey = ref.days[ref.days.length - 1];
  const act = (labelKey, primary, run) => plan.actions.push({ label: t(`kontrola.${labelKey}`), primary, run });
  const openManual = () => openEntryDialog(e0.kind, e0);
  const keep = () => { acknowledgeSignal(s, signalText(s)); renderView(); };

  switch (s.key) {
    case "sigEndBeforeTitle":
      if (e0) {
        const minsOk = e0.kind === "feed" && Number(e0.feed_minutes) > 0;
        plan.fields.push({ label: t("kontrola.end"), old: fmtClock(e0.end_at), neu: minsOk ? fmtClock(plusStampLocal(e0.at, e0.feed_minutes)) : "—" });
        if (minsOk) act("fix", true, () => applyEntryPatch(e0, { end_at: plusStampLocal(e0.at, e0.feed_minutes) }));
        else act("clearEnd", true, () => applyEntryPatch(e0, { end_at: "" }));
        act("swap", false, () => applyEntryPatch(e0, { at: e0.end_at, end_at: e0.at }));
        plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      }
      break;
    case "sigLongTimerTitle":
      if (e0 && e0.timer && !e0.end_at) {
        plan.fields.push({ label: t("kontrola.end"), old: "—", neu: fmtClock(localInput(new Date())) });
        act("endNow", true, () => applyEntryPatch(e0, { end_at: localInput(new Date()) }));
        act("cancelEntry", false, () => deleteEntry(e0));
      } else if (e0) {
        plan.fields.push({ label: t("kontrola.duration"), old: durLabel(e0), neu: null });
        plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      }
      break;
    case "sigLongSleepTitle":
    case "sigLongFeedTitle":
      if (e0) {
        const dur = minutesBetween(e0.at, e0.end_at);
        plan.fields.push({ label: t("kontrola.duration"), old: dur ? `${dur} min` : null, neu: null });
        plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      }
      break;
    case "sigDuplicateTitle":
      if (e0 && e1) {
        plan.fields.push({ label: t("kontrola.at"), old: `${fmtClock(e0.at)} · ${fmtClock(e1.at)}`, neu: null });
        act("delSecond", true, () => deleteEntry(e1));
      }
      break;
    case "sigSleepOverlapTitle":
      if (e0) {
        plan.fields.push({ label: t("kontrola.end"), old: fmtClock(e0.end_at), neu: null });
        plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      }
      break;
    case "sigFeedGapTitle": {
      plan.fields.push({ label: t("kontrola.duration"), old: `${s.params && s.params.n} min`, neu: null });
      if (e0 && e1) {
        const from = new Date(e0.end_at || e0.at), to = new Date(e1.at);
        const mid = new Date((from.getTime() + to.getTime()) / 2);
        act("addFeed", false, () => openEntryDialog("feed", null, localInput(mid)));
      }
      if (e0) plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      break;
    }
    case "sigMissingDayTitle":
    case "sigPartialDayTitle":
    case "sigFeedClusterTitle":
    case "sigSleepHighTitle":
    case "sigSleepLowTitle":
    case "sigNoWetTitle":
      plan.fields.push({ label: t("kontrola.at"), old: null, neu: null });
      break;
    default:
      if (e0 && e0.value !== null && e0.value !== undefined) {
        plan.fields.push({ label: t("kontrola.value"), old: `${fmtNum(e0.value)} ${e0.measure_kind === "weight_g" ? "g" : e0.measure_kind === "temp_c" ? "°C" : ""}`, neu: null });
      }
      if (e0) {
        if (e0.feed_ml !== null && e0.feed_ml !== undefined) plan.fields.push({ label: t("fields.feed_ml"), old: `${e0.feed_ml} ml`, neu: null });
        plan.actions.push({ label: t("kontrola.manual"), primary: false, run: openManual });
      }
      break;
  }
  plan.actions.push({ label: t("kontrola.keep"), primary: false, run: keep });
  return plan;
}

function findMeasure(rows, kindMeasure, dayIso) {
  return (rows || []).find((r) => r.kind === "measure" && r.measure_kind === kindMeasure && r.at.slice(0, 10) === dayIso);
}

function kontrolaCard(s, rows, ctx) {
  const plan = kontrolaPlan(s, rows, ctx);
  const kind = plan.entries[0] ? plan.entries[0].kind : "note";
  const card = h("div", { class: "card kcard " + s.sev, style: `--kc: var(--k-${kind})` });
  const head = h("div", { class: "cardhead" },
    h("span", { class: "qi", style: kindColorVar(kind), html: icon(KIND_ICONS[kind], "sm") }),
    h("h2", {}, t(`insights.${s.key}`)),
    h("span", { class: "spacer" }),
    h("span", { class: "tag " + (s.sev === "bad" ? "bad" : s.sev === "warn" ? "warn" : "ok") }, t(`kontrola.sev${s.sev.charAt(0).toUpperCase() + s.sev.slice(1)}`)),
    dismissButton(s, signalText(s), () => renderView())
  );
  card.append(head);
  card.append(h("p", { class: "muted", style: "margin:0" }, t(`insights.${s.key.replace(/Title$/, "Text")}`, s.params)));

  const shown = plan.fields.filter((f) => f.old !== null && f.old !== undefined);
  if (shown.length) {
    const grid = h("div", { class: "dgrid" },
      h("span"), h("span", { class: "dhead" }, t("kontrola.saved")), h("span", { class: "dhead" }, t("kontrola.proposed")));
    for (const f of shown) {
      grid.append(
        h("span", { class: "dlab" }, f.label),
        h("span", { class: f.neu ? "dold" : "" }, String(f.old)),
        f.neu ? h("span", { class: "dnew" }, String(f.neu)) : h("span", { class: "muted" }, t("kontrola.noAuto"))
      );
    }
    card.append(grid);
  }

  const bar = h("div", { class: "kactions" });
  for (const a of plan.actions) bar.append(h("button", { type: "button", class: a.primary ? "btn primary" : "btn ghost", onclick: a.run }, a.label));
  if (plan.dayKey) bar.append(h("button", { type: "button", class: "klink", onclick: () => { kontrolaExpanded.has(s.sid) ? kontrolaExpanded.delete(s.sid) : kontrolaExpanded.add(s.sid); renderView(); } }, t("kontrola.context")));
  card.append(bar);

  if (plan.dayKey && kontrolaExpanded.has(s.sid)) {
    const dayEntries = rows.filter((r) => r.at.slice(0, 10) === plan.dayKey).slice(0, 14);
    const ctxBox = h("div", { class: "kctx" });
    if (!dayEntries.length && /sigMissingDayTitle/.test(s.key)) {
      ctxBox.append(h("p", { class: "muted" }, t("notices.dayNoEntries")));
      const chips = h("div", { class: "chips", style: "margin-top:6px" });
      for (const k of ["diaper", "feed", "sleep"]) {
        chips.append(h("button", { type: "button", class: "chip", style: kindColorVar(k), onclick: () => openEntryDialog(k, null, `${plan.dayKey}T12:00`) }, t(`kinds.${k}`)));
      }
      ctxBox.append(chips);
    } else {
      const suspect = new Set(plan.entries.map((e) => String(e.id)));
      for (const e of dayEntries) {
        const row = entryRow(e, { compact: true });
        if (suspect.has(String(e.id))) row.classList.add("suspect");
        ctxBox.append(row);
      }
    }
    card.append(ctxBox);
  }
  return card;
}

async function renderKontrola() {
  const root = $("view-kontrola");
  root.innerHTML = "";
  if (!summary) return;
  const ctx = insightCtx();
  let rows = [];
  try { rows = await loadEntries({ from: ctx.days[0] ? ctx.days[0].date : null, limit: 5000 }); } catch { /* offline */ }
  const signals = visibleSignals(analyzeSignals(rows, ctx.completed, ctx.ageDays, ctx.nowStamp).concat(thresholdSignals(rows, ctx)));

  root.append(h("div", { class: "card" },
    h("div", { class: "cardhead" },
      h("h2", {}, t("kontrola.title")),
      signals.length ? h("span", { class: "muted", style: "margin-left:8px" }, String(signals.length)) : null,
      h("span", { class: "spacer" }),
      ignoredButton()
    ),
    signals.length ? null : h("p", { class: "muted", style: "margin:4px 0" }, t("kontrola.empty"))
  ));

  const groups = new Map();
  for (const s of signals) {
    const planDay = kontrolaPlan(s, rows, ctx).dayKey;
    const key = planDay || "range";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const rank = { bad: 0, warn: 1, info: 2 };
  const keys = [...groups.keys()].sort((a, b) => (a === "range" ? 1 : b === "range" ? -1 : b.localeCompare(a)));
  for (const key of keys) {
    root.append(h("h3", { class: "kgrouphead" }, key === "range" ? t("kontrola.range") : dayName(key)));
    for (const s of groups.get(key).sort((a, b) => rank[a.sev] - rank[b.sev])) root.append(kontrolaCard(s, rows, ctx));
  }
}

function dismissButton(item, text, onDismissed) {
  return h("button", {
    type: "button", class: "mini ghost", "data-act": "dismiss", title: t("insights.dismiss"), "aria-label": t("insights.dismiss"),
    html: icon("x", "sm"),
    onclick: () => {
      dismissItem(item, text);
      if (onDismissed) onDismissed();
      toast(t("insights.dismissedToast"), {
        icon: "eye", ms: 5000, actionLabel: t("insights.undoDismiss"),
        action: () => { restoreItem(item.sid); renderView(); },
      });
    },
  });
}

function ignoredButton() {
  const n = dismissedCount();
  if (!n) return null;
  return h("button", { type: "button", class: "mini ghost wide", "data-mgr": "1", onclick: openIgnoredList },
    h("span", { html: icon("eye", "sm") }), t("insights.mgrBtn", { n }));
}

function ruleMetaText(item) {
  const parts = [];
  if (item.rule.maxN != null) parts.push(t("insights.ackMaxUpTo", { n: fmtNum(item.rule.maxN) }));
  parts.push(item.rule.until
    ? t("insights.ackUntil", { until: item.rule.until.slice(0, 10).replace(/-/g, ".") })
    : t("insights.ackUntilForever"));
  return `${t("insights.ackRuleLabel")} (${parts.join(", ")})`;
}

function openIgnoredList() {
  const body = $("listBody");
  $("listTitle").textContent = t("insights.mgrTitle");
  $("listClose").innerHTML = icon("x", "sm");
  body.innerHTML = "";
  const list = dismissedList();
  body.append(h("p", { class: "muted" }, t("insights.mgrSub")));
  if (!list.length) {
    body.append(h("p", { class: "muted" }, t("insights.mgrNone")));
  } else {
    body.append(h("div", { class: "rowbtns" }, h("button", {
      type: "button", class: "ghost", onclick: () => { restoreAllItems(); openIgnoredList(); renderView(); },
    }, t("insights.ignoredRestoreAll"))));
    for (const item of list) {
      const meta = [t("insights.mgrAt", { at: item.at ? item.at.slice(0, 16).replace("T", " ") : "" }),
        item.kind === "ack" ? t("insights.ackKindAck") : t("insights.ackKindHide")];
      if (item.rule) meta.push(ruleMetaText(item));
      body.append(h("div", { class: "ignoreitem " + (item.sev || "info") },
        h("span", { class: "what" },
          h("span", { class: "main" }, item.text),
          h("span", { class: "meta" }, meta.join(" · ")),
          item.reason ? h("span", { class: "why" }, `“${item.reason}”`) : null
        ),
        h("button", { type: "button", class: "mini ghost wide", onclick: () => { restoreItem(item.sid); openIgnoredList(); renderView(); } }, t("insights.undoDismiss"))
      ));
    }
    body.append(h("p", { class: "muted" }, t("insights.ignoredNote")));
  }
  openSheet($("listDialog"));
}

/* Acknowledge sheet: the finding, a scope choice (just this one vs a similar-signal rule),
   an expiry for the rule, and an optional reason we can re-read later in the manager. */
let ackDraft = null;

function ackButton(item, text, onDone) {
  return h("button", {
    type: "button", class: "mini ghost", "data-act": "ack", title: t("insights.ack"), "aria-label": t("insights.ack"),
    html: icon("check", "sm"),
    onclick: () => openAckDialog(item, text, onDone),
  });
}

function openAckDialog(sig, text, onDone) {
  const n = Number(sig.params && sig.params.n);
  ackDraft = { sig, text, onDone, scope: "rule", days: 30 };
  $("ackTitle").textContent = t("insights.ackTitle");
  $("ackClose").innerHTML = icon("x", "sm");
  $("ackCancel").textContent = t("cancel");
  $("ackSave").textContent = t("save");
  const reason = h("textarea", { rows: "2", maxlength: "160", placeholder: t("insights.ackReasonPh") });

  const seg = (options, current, onpick) => h("div", { class: "seg" }, ...options.map(([value, label]) => h("button", {
    type: "button", class: value === current ? "on" : "", onclick: () => onpick(value),
  }, label)));

  const paint = () => {
    const body = $("ackBody");
    body.innerHTML = "";
    body.append(h("p", { class: "acktext" }, signalText(sig)));
    if (sig.sev === "bad") body.append(h("p", { class: "ackwarn" }, t("insights.ackBadNote")));
    body.append(h("div", { class: "field full" },
      h("span", {}, t("insights.ackScope")),
      seg([["once", t("insights.ackOnce")], ["rule", t("insights.ackRule")]], ackDraft.scope, (v) => { ackDraft.scope = v; paint(); })
    ));
    if (ackDraft.scope === "rule") {
      body.append(h("div", { class: "field full" },
        h("span", {}, t("insights.ackDur")),
        seg([[7, t("insights.ack7")], [30, t("insights.ack30")], [0, t("insights.ackForever")]], ackDraft.days, (v) => { ackDraft.days = v; paint(); })
      ));
      body.append(h("small", { class: "hint" }, Number.isFinite(n) ? t("insights.ackCapNote", { n: fmtNum(n) }) : t("insights.ackCapAll")));
    }
    body.append(h("div", { class: "field full" }, h("span", {}, t("insights.ackReason")), reason));
  };
  paint();
  openSheet($("ackDialog"));
}

function saveAck() {
  if (!ackDraft) return;
  const { sig, text, onDone } = ackDraft;
  const reason = ($("ackBody").querySelector("textarea") || {}).value || "";
  const savedSid = acknowledgeSignal(sig, text, ackDraft.scope, ackDraft.days, reason);
  closeSheet($("ackDialog"));
  if (onDone) onDone();
  toast(t("insights.ackSaved"), {
    icon: "check", ms: 5000, actionLabel: t("insights.undoAck"),
    action: () => { restoreItem(savedSid); renderView(); },
  });
}

/* ---------- reference sources (ids match sources/SOURCES.md) ----------
   Checked 2026-10-12; the tag on each card links out so the threshold can be read at source. */

const SOURCES = {
  S122: { label: "insights.srcMzsrf", region: "SK", title: "MZ SR — Štandardný postup BFHI, 2. revízia (starostlivosť o matku a novorodenca)",
    url: "https://www.health.gov.sk/Zdroje?/Sources/dokumenty/SDTP/standardy/Baby-friendly_Hospital_Initiative_Interdisciplinarna_oblast/Standardny_postup_Starostlivost_o_matku_a_novorodenca_podla_zasad_BFHI_podpora_vzahovej_vazby_a_laktacie_2_revizia.pdf" },
  S123: { label: "insights.srcMzsrf", region: "SK", title: "MZ SR — ŠP 0031 BFHI, pôvodné znenie (účinnosť 1. 1. 2019)",
    url: "https://www.health.gov.sk/Zdroje?/Sources/dokumenty/SDTP/standardy/Baby-friendly_Hospital_Initiative_Interdisciplinarna_oblast/Predchadzajuce_verzie/0031_Starostlivost_o_matku_a_novorodenca_podla_zasad_iniciativy_BFHI_-_podpora_vztahovej_vazby_a_laktaci.pdf" },
  S44: { label: "insights.srcWho", region: "WHO", title: "WHO Child Growth Standards — weight increments, girls 0–60 d",
    url: "https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-velocity/weight_inc_birth_to_60_days_girls.pdf" },
  S31: { label: "insights.srcNhs", region: "UK", title: "NHS — is my baby getting enough milk?",
    url: "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding-problems/enough-milk/" },
  S43: { label: "insights.srcNhs", region: "UK", title: "NHS — breastfeeding: the first few days",
    url: "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding/the-first-few-days/" },
  S45: { label: "insights.srcNhs23", region: "UK", title: "NHS — your baby's weight and height",
    url: "https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-height-and-weight/" },
  S116: { label: "insights.srcAwmf", region: "DE", title: "AWMF S3 — Fiebermanagement bei Kindern und Jugendlichen (parents' guide, DGKJ 2025)",
    url: "https://register.awmf.org/de/leitlinien/detail/027-074" },
  S117: { label: "insights.srcAepap", region: "ES", title: "AEPap — Decálogo de la fiebre (Familia y Salud)",
    url: "https://www.familiaysalud.es/sintomas-y-enfermedades/infecciones/fiebre-e-infecciones/decalogo-de-la-fiebre" },
  S124: { label: "insights.srcAap", region: "US", title: "AAP / HealthyChildren.org — How Often to Breastfeed",
    url: "https://www.healthychildren.org/English/ages-stages/baby/breastfeeding/Pages/How-Often-to-Breastfeed.aspx" },
  S29: { label: "insights.srcAbm", region: "US", title: "ABM Clinical Protocol #3 (supplementary feedings)",
    url: "https://abm.memberclicks.net/assets/DOCUMENTS/PROTOCOLS/3-supplementation-protocol-english.pdf" },
  S125: { label: "insights.srcPtgh", region: "PL", title: "PTGHiŻDz — Zasady żywienia zdrowych niemowląt (Standardy Medyczne 2021)",
    url: "https://ptghizd.pl/cm/uploads/2021/04/smp_01_2021_zasady_zywienia_zdrowych_niemowlat.pdf" },
};

/* which registered sources back each tip, priority order (first enabled one is cited).
   Values themselves are source-independent: we always keep the most conservative threshold. */
const SRC_FOR = {
  weightVel: ["S44"],
  regain: ["S45"],
  feeds: ["S122", "S124", "S125", "S43"],
  feedGap: ["S43", "S124"],
  wet: ["S31", "S29"],
  stool: ["S31", "S29"],
  fever: ["S116", "S117"],
};

function srcOffList() { try { const v = JSON.parse(localStorage.getItem("baby.srcOff") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } }
function srcOn(id) { return !srcOffList().includes(id); }
function pickSrc(list) { for (const id of list) if (SOURCES[id] && srcOn(id)) return id; return null; }

function srcTag(id, tagClass) {
  if (!id) return h("span", { class: "tag " + (tagClass || "") }, t("insights.srcOff"));
  const src = SOURCES[id];
  if (!src) return h("span", { class: "tag " + (tagClass || "") }, t(`insights.${id}`));
  return h("a", {
    class: "tag link " + (tagClass || ""), href: src.url, target: "_blank", rel: "noopener noreferrer",
    title: `${id} — ${src.title}`,
  }, h("span", { html: icon("external", "sm") }), `${t(src.label)} ${id}`);
}

function sourceRow() {
  return h("div", { class: "srcline" },
    h("span", { class: "muted" }, t("insights.srcIntro")),
    ...Object.keys(SOURCES).filter(srcOn).map((id) => h("a", {
      class: "srclink", href: SOURCES[id].url, target: "_blank", rel: "noopener noreferrer",
      title: `${id} — ${SOURCES[id].title}`,
    }, h("span", { html: icon("external", "sm") }), `${id} ${t(SOURCES[id].label)}`))
  );
}

function insightCard(kind, title, big, text, tag, tagClass, cid) {
  if (cid && isDismissed(cid)) return null;
  const node = h("div", { class: "insight", style: kindColorVar(kind) },
    h("div", { class: "ihead" },
      h("span", { class: "qi", html: icon(KIND_ICONS[kind] || "bulb", "sm") }),
      h("h3", {}, title),
      cid ? h("span", { class: "spacer" }) : null,
      cid ? dismissButton({ sid: cid, sev: tagClass === "bad" ? "bad" : tagClass === "warn" ? "warn" : "info" }, `${title}${big ? ` — ${big}` : ""}${text ? `. ${text}` : ""}`, () => leaveNode(node)) : null
    ),
    big ? h("div", { class: "big" }, big) : null,
    text ? h("p", {}, text) : null,
    tag || null
  );
  return node;
}

/* Source-registered reference values (sources/SOURCES.md: S29, S31, S43–S45, S116–S118, S122–S125; SRC_FOR maps each tip to its supporting sources, user can toggle citations in Settings → Sources; thresholds stay the most conservative registered values regardless of toggles). */
const REF = {
  feedsPerDay: 8,
  feedGapWatchMin: 180,
  wetPerDay: 6, wetFromDay: 5,
  stoolPerDay: 2, stoolFromDay: 4,
  regainByDays: 21,
  feverC: 38.0,
  weightBands: [
    { maxAge: 7, per: 7, med: 100, p10: -100, p5: -200 },
    { maxAge: 14, per: 7, med: 200, p10: 0, p5: -50 },
    { maxAge: 28, per: 14, med: 550, p10: 350, p5: 300 },
    { maxAge: 42, per: 14, med: 500, p10: 300, p5: 300 },
    { maxAge: 60, per: 18, med: 550, p10: 300, p5: 288 }
  ]
};

function weightBand(ageDays) {
  for (const b of REF.weightBands) if (ageDays <= b.maxAge) return b;
  return null;
}

function fmtAt(at) {
  return at ? `${at.slice(5, 10)} ${fmtClock(at)}` : "";
}

/* Milk-volume reference for entry hints + ml outlier signal (sources/SOURCES.md: S119–S121).
   Week 1 brackets follow stomach capacity (S121); afterwards ~150(–180) ml/kg/day divided by
   typical feeds per day (S119 Voedingscentrum, S120 CZ practice). Per-feed brackets without a
   recent weight are that rule evaluated for median infant weights – a coarse fallback. */
const ML_REF = {
  brackets: [[1, 5, 10], [3, 15, 30], [7, 30, 60], [14, 60, 90], [29, 80, 120], [59, 100, 140], [89, 120, 160], [119, 130, 180], [179, 140, 200], [269, 150, 210], [Infinity, 150, 180]],
  feeds: [[14, 10], [59, 8], [119, 7], [179, 6], [239, 5], [309, 4], [Infinity, 3]],
};
function mlBracketAt(ageDays) { return ML_REF.brackets.find(([maxD]) => ageDays <= maxD) || ML_REF.brackets[ML_REF.brackets.length - 1]; }
function milkRef(ageDays, weightG) {
  if (ageDays === null || ageDays < 0) return null;
  const b = mlBracketAt(ageDays);
  const f = (ML_REF.feeds.find(([maxD]) => ageDays <= maxD) || [Infinity, 3])[1];
  // per-kg rule applies only while milk is (nearly) the whole diet: day 8 to ~6 months
  if (weightG && weightG >= 2500 && ageDays >= 8 && ageDays <= 180) {
    const dayLo = Math.round(weightG / 1000 * 150 / 10) * 10;
    const dayHi = Math.round(weightG / 1000 * 180 / 10) * 10;
    return { perLo: Math.max(10, Math.round(dayLo / f / 5) * 5), perHi: Math.round(dayHi / f / 5) * 5, dayLo, dayHi, f, weightG, basis: "weight" };
  }
  return { perLo: b[1], perHi: b[2], f, basis: "age" };
}
function fillMilkHint(row, entry, atPreset) {
  const hint = h("small", { class: "hint" });
  row.append(hint);
  const stamp = (entry && entry.at) || atPreset || localInput(new Date());
  const ageDays = meta && meta.birth_date ? ageAtDate(meta.birth_date, String(stamp).slice(0, 10)) : null;
  const paint = (r) => {
    if (!hint.isConnected || !r) return;
    hint.textContent = t("hints.milk", { lo: r.perLo, hi: r.perHi });
    if (r.basis === "weight") hint.textContent += ` · ${t("hints.milkDay", { dlo: r.dayLo, dhi: r.dayHi, f: r.f })}`;
    hint.title = r.basis === "weight" ? t("hints.infoWeight", { w: fmtNum(Math.round(r.weightG / 100) / 10), f: r.f }) : t("hints.infoAge");
  };
  paint(milkRef(ageDays, null));
  // newest weight from either an explicit weigh-in (measure) or a scale_after_g reading on
  // a feed entry — both are real weights; lists come back at DESC so find() hits the newest
  Promise.all([
    loadEntries({ kind: "measure", limit: 300 }).catch(() => []),
    loadEntries({ kind: "feed", limit: 60 }).catch(() => []),
  ]).then(([measures, feeds]) => {
    const w = measures.find((x) => x.measure_kind === "weight_g" && Number.isFinite(x.value) && x.value > 1500);
    const s = feeds.find((x) => Number.isFinite(x.scale_after_g) && x.scale_after_g > 1500);
    let best = w ? { at: w.at, value: w.value } : null;
    if (s && (!best || String(s.at) > String(best.at))) best = { at: s.at, value: s.scale_after_g };
    if (best) paint(milkRef(ageDays, best.value));
  });
}

/* ---------- scale photos: seven-segment display reader (on-device, best-effort) ----------
   Experimental OCR of a baby-scale display: binarize (Otsu, both polarities), connected
   components → best digit row → 7-segment template decode. The value is only a suggestion;
   the field stays user-editable and every reading is saved alongside the entry. */

function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }

function readFileDataUrl(file) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });
}

async function compressImage(file) {
  const src = await readFileDataUrl(file); // CSP-safe (no blob:)
  const img = await loadImage(src);
  const sc = Math.min(1, 1000 / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.85);
}

const SEG_MAP = { "1111110": "0", "0110000": "1", "1101101": "2", "1111001": "3", "0110011": "4", "1011011": "5", "1011111": "6", "1110000": "7", "1111111": "8", "1111011": "9", "0000001": "-" };
const CELL_PROBES = [ // segment occupancy boxes a,b,c,d,e,f,g as fractions of the cell box
  [0.18, 0.82, 0.04, 0.13], [0.82, 0.96, 0.14, 0.45], [0.82, 0.96, 0.55, 0.86], [0.18, 0.82, 0.87, 0.97],
  [0.04, 0.18, 0.55, 0.86], [0.04, 0.18, 0.14, 0.45], [0.18, 0.82, 0.44, 0.56],
];

function otsuThreshold(g) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < g.length; i++) hist[Math.min(255, Math.max(0, Math.round(g[i])))]++;
  const total = g.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, bestTh = 127, bestVar = -1;
  for (let th = 0; th < 256; th++) {
    wB += hist[th]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += th * hist[th];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) { bestVar = between; bestTh = th; }
  }
  return bestTh;
}

function components(ink, w, h) {
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let i = 0; i < w * h; i++) {
    if (!ink[i] || seen[i]) continue;
    seen[i] = 1;
    const stack = [i];
    let x0 = i % w, x1 = x0, y0 = (i / w) | 0, y1 = y0, area = 0;
    while (stack.length) {
      const p = stack.pop(); area++;
      const px = p % w, py = (p / w) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > 0 && ink[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (px < w - 1 && ink[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (py > 0 && ink[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (py < h - 1 && ink[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    if (area >= 6) out.push({ x0, y0, x1, y1, area });
  }
  return out;
}

function decodeCell(ink, w, c) {
  const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1;
  if (cw < 3 || ch < 6) return "?";
  let bits = "";
  for (const [fx0, fx1, fy0, fy1] of CELL_PROBES) {
    const ax = Math.max(0, Math.round(fx0 * cw)), bx = Math.min(cw - 1, Math.round(fx1 * cw));
    const ay = Math.max(0, Math.round(fy0 * ch)), by = Math.min(ch - 1, Math.round(fy1 * ch));
    let on = 0, tot = 0;
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { tot++; if (ink[(c.y0 + y) * w + c.x0 + x]) on++; }
    bits += tot > 4 && on / tot > 0.42 ? "1" : "0";
  }
  return SEG_MAP[bits] || "?";
}

function decodeRow(ink, w, h) {
  const cells = components(ink, w, h);
  if (cells.length < 2) return null;
  const fillOf = (c) => c.area / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1));
  const seeds = cells.filter((c) => {
    const hs0 = c.y1 - c.y0;
    return hs0 >= 8 && hs0 <= h * 0.45 && fillOf(c) > 0.15 && (c.x1 - c.x0 + 1) / (hs0 + 1) < 2.2;
  });
  let best = null;
  const seenBands = new Set();
  for (const seed of seeds) {
    const hs0 = seed.y1 - seed.y0;
    const cy = (seed.y0 + seed.y1) / 2;
    const group = cells.filter((c) => Math.abs((c.y0 + c.y1) / 2 - cy) < hs0 * 1.6 && (c.y1 - c.y0) / hs0 > 0.25);
    if (group.length < 3) continue;
    const ymin = Math.min(...group.map((c) => c.y0)), ymax = Math.max(...group.map((c) => c.y1));
    const rowH = ymax - ymin + 1;
    if (rowH > h * 0.5 || rowH < 8) continue;
    const bandKey = ymin + ":" + ymax;
    if (seenBands.has(bandKey)) continue;
    seenBands.add(bandKey);
    const runs = [];
    let runStart = -1, gap = 0;
    for (let xx = 0; xx < w; xx++) {
      let has = false;
      for (let yy = ymin; yy <= ymax && !has; yy++) if (ink[yy * w + xx]) has = true;
      if (has) { if (runStart < 0) runStart = xx; gap = 0; }
      else if (runStart >= 0) { gap++; if (gap >= 3) { runs.push([runStart, xx - gap]); runStart = -1; gap = 0; } }
    }
    if (runStart >= 0) runs.push([runStart, w - 1]);
    if (runs.length < 2) continue;
    const boxes = [];
    for (const [rx0, rx1] of runs) {
      let cy0 = ymax + 1, cy1 = ymin - 1;
      for (let yy = ymin; yy <= ymax; yy++) for (let xx = rx0; xx <= rx1; xx++) {
        if (!ink[yy * w + xx]) continue;
        if (yy < cy0) cy0 = yy;
        if (yy > cy1) cy1 = yy;
        break;
      }
      if (cy1 < cy0) continue;
      const cw = rx1 - rx0 + 1, chh = cy1 - cy0 + 1;
      boxes.push({ rx0, rx1, dot: chh < rowH * 0.45 && cw < rowH * 0.6 });
    }
    const digitBoxes = boxes.filter((b) => !b.dot);
    if (!digitBoxes.length) continue;
    const wideW = Math.max(...digitBoxes.map((b) => b.rx1 - b.rx0 + 1));
    let text = "", ok = 0, unknown = 0;
    for (const b of boxes) {
      if (b.dot) { text += "."; continue; }
      // narrow cells ("1") would fill their own probe boxes; right-align them on a nominal digit width
      let bx0 = b.rx0;
      if (b.rx1 - b.rx0 + 1 < wideW * 0.55) bx0 = Math.max(0, b.rx1 - Math.round(wideW * 0.92) + 1);
      const dch = decodeCell(ink, w, { x0: bx0, y0: ymin, x1: b.rx1, y1: ymax });
      if (dch === "?") { unknown++; continue; }
      text += dch;
      if (dch >= "0" && dch <= "9") ok++;
    }
    text = text.replace(/\.{2,}/g, ".").replace(/^[.,]+|[.,]+$/g, "");
    if (!ok) continue;
    const score = ok * ok + (/^\d{1,2}[.,]\d{1,3}$/.test(text) ? 40 : 0);
    const res = { text, score, conf: ok / Math.max(1, ok + unknown) };
    if (!best || res.score > best.score) best = res;
  }
  return best;
}

async function readScaleImage(dataUrl) {
  const img = await loadImage(dataUrl);
  const cv = document.createElement("canvas");
  const sc = Math.min(1, 900 / Math.max(img.width, img.height));
  cv.width = Math.max(16, Math.round(img.width * sc)); cv.height = Math.max(16, Math.round(img.height * sc));
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const w = data.width, h = data.height;
  const gr = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { const p = i * 4; gr[i] = data.data[p] * 0.299 + data.data[p + 1] * 0.587 + data.data[p + 2] * 0.114; }
  const th = otsuThreshold(gr);
  let best = null;
  for (const inv of [false, true]) {
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < gr.length; i++) ink[i] = inv ? (gr[i] > th + 12 ? 1 : 0) : (gr[i] < th - 12 ? 1 : 0);
    const r = decodeRow(ink, w, h);
    if (r && (!best || r.score > best.score)) best = r;
  }
  if (!best) return null;
  let value = null;
  const m = best.text.match(/^(-?\d{1,2}([.,]\d{1,3}))$/); // kg display like "6.240"/"0.385"; gram displays are not auto-converted
  if (m) { const num = parseFloat(m[1].replace(",", ".")); if (num >= 0.02 && num <= 40) value = num; }
  return { text: best.text, value, confidence: best.conf };
}

/* stash: a "before" reading taken in a dialog that was closed without saving */
function scaleMode() { const v = localStorage.getItem("baby.scaleMode"); return v === "off" || v === "manual" ? v : "photo"; }
function getScaleStash() { try { return JSON.parse(localStorage.getItem("baby.scalestash") || "null"); } catch { return null; } }
function setScaleStash(g) { if (!g) return; try { localStorage.setItem("baby.scalestash", JSON.stringify({ g, ts: Date.now() })); } catch {} }
function clearScaleStash() { localStorage.removeItem("baby.scalestash"); }

/* kg box accepts "6,24" / "6.240" / "6,2 kg" and whole gram readings ("6240").
   Returns grams or null — callers must show an error for non-empty-but-unparsed text,
   never drop it silently (manual entry that vanishes on save is the #1 complaint). */
function parseKg(raw) {
  const t0 = String(raw).trim();
  if (!t0) return null;
  const v = parseFloat(t0.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(v)) return null;
  // whole number ≥50 with no decimal separator: a gram-style reading from the scale
  if (!/[.,]/.test(t0) && v >= 50 && v <= 30000) return Math.round(v);
  return v >= 0.02 && v <= 35 ? Math.round(v * 1000) : null;
}
function fmtKg(x) { return String(Math.round(x * 1000) / 1000).replace(".", ","); }

function buildScaleSection(entry, feedMlHolder) {
  const mode = scaleMode(); // "photo" | "manual" — "off" callers skip building entirely
  const box = h("div", { class: "scalebox" });
  const state = { a: { img: null, g: null, hadSaved: false }, b: { img: null, g: null, hadSaved: false } };
  let savedToServer = false;
  const delta = h("span", { class: "scaledelta" });
  box.append(h("div", { class: "scalehead" }, h("b", {}, t(mode === "photo" ? "scale.title" : "scale.titleManual")), delta));

  // When both weigh-ins are in, the difference is the milk taken. The ml field is
  // auto-filled and keeps tracking the weights until the user types their own value
  // (cur !== "" && cur !== mlAuto ⇒ manual override, respected from then on).
  const mlIn = feedMlHolder ? feedMlHolder.input.querySelector("input") : null;
  let mlAuto = null;

  const update = () => {
    delta.textContent = "";
    delta.classList.remove("bad");
    if (state.a.g && state.b.g) {
      const diff = state.b.g - state.a.g;
      if (diff >= 2 && diff <= 400) {
        delta.textContent = t("scale.delta", { g: Math.round(diff), ml: Math.round(diff) });
        if (mlIn) {
          const cur = mlIn.value.trim();
          const val = String(Math.round(diff));
          if (!cur || cur === mlAuto) {
            mlIn.value = val;
            mlIn.dispatchEvent(new Event("input", { bubbles: true }));
            mlAuto = val;
          }
        }
      } else { delta.classList.add("bad"); delta.textContent = t("scale.bad", { g: Math.round(diff) }); }
    }
  };

  const mkSlot = (key, label) => {
    const wrap = h("div", { class: "scaleslot" });
    let img = null, btnCam = null, btnUp = null, fileCam = null, fileUp = null;
    const kg = h("input", { type: "text", inputMode: "decimal", class: "scalekg", placeholder: `${t("scale.kg")}…` });
    const note = h("small", { class: "hint" });
    if (mode === "photo") {
      img = h("img", { class: "thumb hidden", alt: "" });
      // two pickers: capture opens the camera directly, the plain one the gallery/file chooser
      fileCam = h("input", { type: "file", accept: "image/*", capture: "environment", class: "hidden" });
      fileUp = h("input", { type: "file", accept: "image/*", class: "hidden" });
      // When the built-in seven-segment reader fails, ask the configured vision model via the server.
      // Only offered when Settings → AI assistant is set up; the field stays editable either way.
      const llmReady = () => llmCfg && llmCfg.provider !== "off" && llmCfg.model;
      const aiRead = async (dataUrl, restoreTo) => {
        note.textContent = t("scale.aiWait");
        try {
          const d = await api(API.llmScale, { method: "POST", body: JSON.stringify({ image: dataUrl }) });
          if (!kg.isConnected) return; // dialog closed meanwhile
          if (d && Number.isFinite(d.value)) {
            kg.value = fmtKg(d.value); state[key].g = Math.round(d.value * 1000); kg.classList.remove("bad-in");
            note.textContent = t("scale.autoAi");
          } else note.textContent = restoreTo;
        } catch { if (kg.isConnected) note.textContent = restoreTo; }
      };
      const handle = async (f) => {
        if (!f) return;
        note.textContent = "…";
        try {
          const dataUrl = await compressImage(f);
          state[key].img = dataUrl;
          img.src = dataUrl; img.classList.remove("hidden");
          const r = await readScaleImage(dataUrl);
          if (r && r.value) { kg.value = fmtKg(r.value); state[key].g = Math.round(r.value * 1000); kg.classList.remove("bad-in"); note.textContent = `${t("scale.auto")} · ${Math.round((r.confidence || 0.5) * 100)} %`; }
          else {
            const fail = r && r.text ? `„${r.text}" — ${t("scale.manual")}` : t("scale.manual");
            note.textContent = fail;
            if (llmReady()) await aiRead(dataUrl, fail);
          }
        } catch { note.textContent = t("scale.manual"); }
        update();
      };
      fileCam.addEventListener("change", () => { handle(fileCam.files && fileCam.files[0]); fileCam.value = ""; });
      fileUp.addEventListener("change", () => { handle(fileUp.files && fileUp.files[0]); fileUp.value = ""; });
      btnCam = h("button", { type: "button", class: "mini ghost", html: icon("camera", "sm") + " " + t("scale.take") });
      btnUp = h("button", { type: "button", class: "mini ghost", html: icon("upload", "sm") + " " + t("scale.upload") });
      btnCam.onclick = () => fileCam.click();
      btnUp.onclick = () => fileUp.click();
    }
    const refreshBad = () => {
      const badNow = kg.value.trim() !== "" && state[key].g == null;
      kg.classList.toggle("bad-in", badNow);
      if (badNow) note.textContent = t("scale.badKg");
      else if (note.textContent === t("scale.badKg")) note.textContent = "";
    };
    kg.addEventListener("input", () => { state[key].g = parseKg(kg.value); refreshBad(); update(); });
    const kids = [h("span", { class: "lbl" }, label)];
    if (mode === "photo") kids.push(img, h("div", { class: "scalerow" }, btnCam, btnUp), fileCam, fileUp);
    kids.push(kg, note);
    wrap.append(...kids);
    return { wrap, img, kg, note };
  };

  const slotA = mkSlot("a", t("scale.before"));
  const slotB = mkSlot("b", t("scale.after"));
  box.append(h("div", { class: "scaleslots" }, slotA.wrap, slotB.wrap));

  const hasOwnScale = entry && (entry.scale_before_g || entry.scale_after_g);
  if (hasOwnScale) {
    if (entry.scale_before_g) { state.a.g = entry.scale_before_g; slotA.kg.value = fmtKg(entry.scale_before_g / 1000); }
    if (entry.scale_after_g) { state.b.g = entry.scale_after_g; slotB.kg.value = fmtKg(entry.scale_after_g / 1000); state.b.hadSaved = true; }
    if (mode === "photo") api(`${API.entries}/${entry.id}/photos`).then((p) => {
      if (p.photo_a) { slotA.img.src = p.photo_a; slotA.img.classList.remove("hidden"); state.a.img = p.photo_a; state.a.hadSaved = true; }
      if (p.photo_b) { slotB.img.src = p.photo_b; slotB.img.classList.remove("hidden"); state.b.img = p.photo_b; }
    }).catch(() => {});
  } else {
    const st = getScaleStash();
    if (st && st.g && Date.now() - st.ts < 3 * 3600e3) { state.a.g = st.g; slotA.kg.value = fmtKg(st.g / 1000); slotA.note.textContent = t("scale.fromStash"); }
  }
  update();

  return {
    box, state,
    // save-time guards: kg fields with text that did not parse must block the submit
    // with a visible message instead of being dropped from the body silently
    fieldErrors() {
      const bad = [];
      if (slotA.kg.value.trim() && state.a.g == null) bad.push("a");
      if (slotB.kg.value.trim() && state.b.g == null) bad.push("b");
      return bad;
    },
    markErrors(keys) {
      for (const k of keys) {
        const el = k === "a" ? slotA : slotB;
        el.kg.classList.add("bad-in");
        el.note.textContent = t("scale.badKg");
      }
    },
    // computed milk (g ≈ ml) from the two weigh-ins, valid band only — used at save so a
    // feed never persists before/after weights without the derived amount
    derivedMl() {
      if (state.a.g && state.b.g) {
        const diff = Math.round(state.b.g - state.a.g);
        if (diff >= 2 && diff <= 400) return diff;
      }
      return null;
    },
    // sides that had a saved reading but the user wiped the field ⇒ send "" to clear
    cleared() {
      const c = [];
      if (entry && entry.scale_before_g && state.a.g == null) c.push("scale_before_g");
      if (entry && entry.scale_after_g && state.b.g == null) c.push("scale_after_g");
      return c;
    },
    markSaved() { savedToServer = true; clearScaleStash(); },
    stashOnClose() { if (!savedToServer && !hasOwnScale && !state.b.g && (state.a.img || state.a.g)) setScaleStash(state.a.g || parseKg(slotA.kg.value)); },
  };
}

async function attachScalePhotos(entryId, state) {
  for (const slot of ["a", "b"]) {
    const s = state[slot];
    if (s.img || s.hadSaved) await api(`${API.entries}/${entryId}/photo`, { method: "POST", body: JSON.stringify({ slot, data: s.img || "" }) });
  }
}

function ageAtDate(birthDate, date) {
  if (!birthDate || !date) return null;
  return Math.round((new Date(date) - new Date(birthDate)) / 864e5);
}

/* One stable sid per signal (key + entry id / day / rolling window) so a dismissal sticks
   to that specific finding and not to the whole family of checks. */
function analyzeSignals(rows, completed, ageDays, nowStamp) {
  const out = [];
  const add = (sev, key, params, id) => out.push({ sev, key, params, sid: `${key}|${id ?? ""}` });
  const sorted = rows.slice().sort((a, b) => a.at.localeCompare(b.at));
  const birthDate = meta && meta.birth_date ? meta.birth_date : null;
  const firstDate = sorted.length ? sorted[0].at.slice(0, 10) : null;

  for (const r of sorted) {
    const kind = t(`kinds.${r.kind}`);
    // judge "future" against the viewer's own clock with a 30 min margin: devices in
    // shared households drift by minutes (entry.at is stamped by the creating device),
    // so anything smaller than this is clock skew, not a data error.
    if (new Date(r.at).getTime() - Date.now() > 30 * 60000) add("bad", "sigFutureTitle", { kind, at: fmtAt(r.at) }, r.id);
    if (r.end_at && r.end_at < r.at) add("bad", "sigEndBeforeTitle", { kind, at: fmtAt(r.at), end: fmtAt(r.end_at) }, r.id);
    if (r.timer && !r.end_at) {
      const open = effMinutes(r, nowStamp);
      if (open > 720) add("warn", "sigLongTimerTitle", { kind, n: open }, r.id);
    }
    if (r.end_at) {
      const dur = effMinutes(r, r.end_at);
      if (r.kind === "sleep" && dur && dur > 1080) add("warn", "sigLongSleepTitle", { n: dur, at: fmtAt(r.at) }, r.id);
      if (r.kind === "feed" && dur && dur > 180) add("warn", "sigLongFeedTitle", { n: dur, at: fmtAt(r.at) }, r.id);
      if ((r.kind === "walk" || r.kind === "bath" || r.kind === "activity") && dur && dur > 240) add("info", "sigLongTimerTitle", { kind, n: dur }, r.id);
    }
    if (r.kind === "feed" && Number.isFinite(r.feed_ml)) {
      const ageMl = ageAtDate(birthDate, r.at.slice(0, 10));
      const hiMl = ageMl !== null ? mlBracketAt(ageMl)[2] : 120;
      if (r.feed_ml > Math.round(hiMl * 1.4 / 5) * 5) add(r.feed_ml > Math.round(hiMl * 2 / 5) * 5 ? "bad" : "warn", "sigMlHighTitle", { ml: r.feed_ml, at: fmtAt(r.at) }, r.id);
    }
    if (r.kind === "measure" && r.measure_kind === "temp_c" && Number.isFinite(r.value)) {
      if (r.value >= 38) add("bad", "sigTempHighTitle", { t: fmtNum(r.value), at: fmtAt(r.at) }, r.id);
      if (r.value < 36) add("warn", "sigTempLowTitle", { t: fmtNum(r.value), at: fmtAt(r.at) }, r.id);
    }
    if (r.kind === "measure" && r.measure_kind === "weight_g" && Number.isFinite(r.value) && (r.value < 1500 || r.value > 6000)) {
      add("warn", "sigWeightRangeTitle", { g: fmtNum(r.value) }, r.id);
    }
    if (r.kind === "diaper" && r.diaper_colour) {
      const entryAge = ageAtDate(birthDate, r.at.slice(0, 10));
      if (r.diaper_colour === "red") add("bad", "sigStoolColourTitle", { colour: t(`diaper_colours.${r.diaper_colour}`), at: fmtAt(r.at) }, r.id);
      if (r.diaper_colour === "black" && entryAge !== null && entryAge > 3) add("warn", "sigStoolColourTitle", { colour: t(`diaper_colours.${r.diaper_colour}`), at: fmtAt(r.at) }, r.id);
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    if (a.kind === b.kind && a.user === b.user) {
      const gap = minutesBetween(a.at, b.at);
      if (gap !== null && gap <= 2) add(gap === 0 ? "bad" : "warn", "sigDuplicateTitle", { kind: t(`kinds.${a.kind}`), at: fmtAt(b.at) }, `${a.id}-${b.id}`);
    }
  }

  const sleep = sorted.filter((r) => r.kind === "sleep" && r.end_at).sort((a, b) => a.at.localeCompare(b.at));
  for (let i = 1; i < sleep.length; i++) {
    if (sleep[i].at < sleep[i - 1].end_at) add("warn", "sigSleepOverlapTitle", { a: fmtAt(sleep[i - 1].at), b: fmtAt(sleep[i].at) }, `${sleep[i - 1].id}-${sleep[i].id}`);
  }

  const feeds = sorted.filter((r) => r.kind === "feed" && !(r.timer && !r.end_at)).sort((a, b) => a.at.localeCompare(b.at));
  for (let i = 1; i < feeds.length; i++) {
    const gap = minutesBetween(feeds[i - 1].end_at || feeds[i - 1].at, feeds[i].at);
    if (gap !== null && gap > 300) add(gap > 420 ? "bad" : "warn", "sigFeedGapTitle", { n: gap, at: fmtAt(feeds[i].at) }, `${feeds[i - 1].id || feeds[i - 1].at}-${feeds[i].id || feeds[i].at}`);
  }

  const wet = sorted.filter((r) => r.kind === "diaper" && (r.diaper_type === "wet" || r.diaper_type === "mixed"));
  if (ageDays !== null && ageDays >= 5) {
    const lastWet = wet.length ? wet[wet.length - 1].at : null;
    const since = lastWet ? minutesBetween(lastWet, nowStamp) : null;
    if (!lastWet || (since !== null && since > 720)) add("bad", "sigNoWetTitle", { last: lastWet ? fmtAt(lastWet) : "—" }, nowStamp.slice(0, 10));
  }

  const activeDates = new Set(completed.filter((d) => (d.entry_count || 0) > 0).map((d) => d.date));
  const scores = completed.map((d) => Number(d.entry_count) || 0).filter((v) => v > 0).sort((a, b) => a - b);
  const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;
  for (const d of completed) {
    if (birthDate && d.date < birthDate) continue;
    if (firstDate && d.date < firstDate) continue;
    const count = Number(d.entry_count) || 0;
    if (count === 0) add("warn", "sigMissingDayTitle", { date: d.date.slice(5) }, d.date);
    if (d.first_at && d.first_at.slice(11) >= "12:00" && median && count < median * 0.75) {
      add("info", "sigPartialDayTitle", { date: d.date.slice(5), time: d.first_at.slice(11, 16) }, d.date);
    }
    if (d.feeds > 16) add("warn", "sigFeedClusterTitle", { date: d.date.slice(5), n: d.feeds }, d.date);
    const sleepHours = (Number(d.sleep_minutes) || 0) / 60;
    if (sleepHours > 20) add("warn", "sigSleepHighTitle", { date: d.date.slice(5), h: sleepHours.toFixed(1) }, d.date);
    if (sleepHours > 0 && sleepHours < 6) add("warn", "sigSleepLowTitle", { date: d.date.slice(5), h: sleepHours.toFixed(1) }, d.date);
  }

  const weights = (summary.weights || []).filter((w) => Number.isFinite(w.value)).sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < weights.length; i++) {
    const a = weights[i - 1], b = weights[i];
    const days = Math.max(1, Math.round((new Date(b.date) - new Date(a.date)) / 864e5));
    const delta = b.value - a.value;
    const per = Math.round((delta / days) * 10) / 10;
    if (per > 60) add("warn", "sigWeightJumpTitle", { from: fmtNum(a.value), to: fmtNum(b.value), per: fmtNum(per) }, `${a.date}-${b.date}`);
    if (delta < -100) add("warn", "sigWeightDropTitle", { from: fmtNum(a.value), to: fmtNum(b.value), pct: Math.round((Math.abs(delta) / a.value) * 100) }, `${a.date}-${b.date}`);
  }

  const rank = { bad: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev]);
}

/* Window-derived threshold signals (not tied to one entry). Their sid carries the rolling
   window, so a dismissal ages out when the window moves on. */
function thresholdSignals(rows, ctx) {
  const out = [];
  const add = (sev, key, params) => out.push({ sev, key, params, sid: `${key}|${ctx.window}` });
  const completed = ctx.completed;
  const cn = completed.filter((d) => (d.wet + d.dirty + d.mixed + d.feeds + d.sleep_minutes) > 0).length;
  const csum = (fn) => completed.reduce((acc, d) => acc + (Number(fn(d)) || 0), 0);

  if (cn && ctx.ageDays !== null && ctx.ageDays >= REF.wetFromDay) {
    const wet = Math.round((csum((d) => (d.wet || 0) + (d.mixed || 0)) / cn) * 10) / 10;
    if (wet < REF.wetPerDay) add("bad", "sigWetLowTitle", { n: fmtNum(wet) });
  }
  if (cn && ctx.ageDays !== null && ctx.ageDays >= REF.stoolFromDay) {
    const stool = Math.round((csum((d) => (d.dirty || 0) + (d.mixed || 0)) / cn) * 10) / 10;
    if (stool < REF.stoolPerDay) add("warn", "sigStoolLowTitle", { n: fmtNum(stool) });
  }
  const weights = (summary && summary.weights ? summary.weights : []).filter((w) => Number.isFinite(w.value));
  if (weights.length >= 2) {
    const first = weights[0], last = weights[weights.length - 1];
    const spanDays = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 864e5));
    const perDay = Math.round(((last.value - first.value) / spanDays) * 10) / 10;
    const band = weightBand(ctx.ageDays !== null ? ctx.ageDays : spanDays);
    if (band) {
      const observed = Math.round(perDay * band.per);
      if (observed < band.p5) add("bad", "sigWeightLowTitle", { per: fmtNum(perDay) });
      else if (observed < band.p10) add("warn", "sigWeightWatchTitle", { per: fmtNum(perDay) });
    }
  }
  return out;
}

/* Shared window for the Today notices and the Tips view — must match, otherwise the
   same finding would get two different sids. */
function insightCtx() {
  const days = ((summary && summary.days) || []).slice(-Math.max(7, statsDays));
  const todayDate = meta && meta.server_time ? meta.server_time.slice(0, 10) : isoDay(new Date());
  const ageNum = meta ? Number(meta.age_days) : NaN;
  return {
    days,
    todayDate,
    completed: days.filter((d) => d.date < todayDate),
    ageDays: Number.isFinite(ageNum) ? ageNum : null,
    nowStamp: meta && meta.server_time ? meta.server_time : localInput(new Date()),
    window: days.length ? `${days[0].date}..${todayDate}` : isoDay(new Date()),
  };
}

const SIGNAL_PREVIEW = 6;

function signalCard(allSignals, rows = []) {
  const card = h("div", { class: "insight signals-card", style: kindColorVar("note") });
  const paint = () => {
    card.innerHTML = "";
    const list = visibleSignals(allSignals);
    card.append(h("div", { class: "ihead" },
      h("span", { class: "qi", html: icon("bulb", "sm") }),
      h("h3", {}, t("insights.signalsTitle")),
      h("span", { class: "spacer" }),
      ignoredButton()
    ));
    card.append(h("div", { class: "big" }, t("insights.signalsBig", { n: list.length })));
    if (!list.length) {
      card.append(h("p", { class: "muted" }, t("insights.signalsNone")));
    } else {
      const shown = signalsExpanded ? list : list.slice(0, SIGNAL_PREVIEW);
      card.append(h("ul", { class: "signals" }, shown.map((s) => signalListItem(s, signalText(s), rows, paint))));
      if (list.length > shown.length) {
        card.append(h("button", { type: "button", class: "mini ghost wide", onclick: () => { signalsExpanded = true; paint(); } },
          t("insights.signalsMore", { n: list.length - shown.length })));
      } else if (signalsExpanded && list.length > SIGNAL_PREVIEW) {
        card.append(h("button", { type: "button", class: "mini ghost wide", onclick: () => { signalsExpanded = false; paint(); } }, t("insights.fewerSignals")));
      }
    }
    card.append(h("span", {
      class: "tag " + (list.some((s) => s.sev === "bad") ? "bad" : list.some((s) => s.sev === "warn") ? "warn" : "ok"),
    }, t("insights.srcUnsourced")));
  };
  paint();
  return card;
}

async function renderInsights() {
  const root = $("view-insights");
  root.innerHTML = "";
  const grid = h("div", { class: "igrid" });
  const addCard = (node) => { if (node) grid.append(node); };
  root.append(grid, sourceRow());
  root.append(h("p", { class: "disclaimer" }, t("insights.disclaimer")));

  if (!summary) return;
  const ctx = insightCtx();
  const days = ctx.days;
  const todayDate = ctx.todayDate;
  const completed = ctx.completed;
  const cn = completed.filter((d) => (d.wet + d.dirty + d.mixed + d.feeds + d.sleep_minutes) > 0).length;
  const csum = (fn) => completed.reduce((acc, d) => acc + (Number(fn(d)) || 0), 0);
  const today = days.find((d) => d.date === todayDate) || null;
  const ageDays = ctx.ageDays;
  const completedNote = cn ? ` ${t("insights.completedDays", { n: cn })}` : "";

  // weight velocity vs WHO GVS increments (S44)
  const weights = (summary.weights || []).filter((w) => Number.isFinite(w.value));
  if (weights.length >= 2) {
    const first = weights[0], last = weights[weights.length - 1];
    const spanDays = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 864e5));
    const perDay = (last.value - first.value) / spanDays;
    const band = weightBand(ageDays !== null ? ageDays : spanDays);
    if (band) {
      const observed = Math.round(perDay * band.per);
      const big = t("insights.weightBig", { per: fmtNum(Math.round(perDay * 10) / 10) });
      const text = `${t("insights.weightBand", { med: band.med, per: band.per, p10: band.p10 })} ` +
        (observed >= band.p10 ? t("insights.weightOk")
          : observed >= band.p5 ? t("insights.weightWatch")
            : t("insights.weightLow"));
      const cls = observed >= band.p10 ? "ok" : observed >= band.p5 ? "warn" : "bad";
      addCard(insightCard("measure", t("insights.weightTitle"), big, text, srcTag(pickSrc(SRC_FOR.weightVel), cls), cls, "card.weight"));
    } else {
      addCard(insightCard("measure", t("insights.weightTitle"),
        t("insights.weightBig", { per: fmtNum(Math.round(perDay * 10) / 10) }),
        "", srcTag("tagMeasured"), "", "card.weight"));
    }
    if (ageDays !== null && ageDays >= REF.regainByDays && last.value < first.value) {
      addCard(insightCard("measure", t("insights.regainTitle"), "",
        t("insights.regainWarn", { age: ageDays, last: fmtNum(last.value), first: fmtNum(first.value) }),
        srcTag(pickSrc(SRC_FOR.regain), "bad"), "bad", "card.regain"));
    }
  } else {
    addCard(insightCard("measure", t("insights.weightTitle"), "", t("insights.weightFew"), srcTag("tagMeasured")));
  }

  // feeds per day + gaps vs NHS first-few-days (S43)
  let feeds = [];
  try {
    feeds = await loadEntries({ from: days[0] ? days[0].date : null, kind: "feed", limit: 2000 });
  } catch { /* offline: skip feed interval insights */ }
  const done = feeds.filter((f) => !(f.timer && !f.end_at));
  const completedFeeds = done.filter((f) => f.at.slice(0, 10) < todayDate);
  const feedPerDay = cn ? Math.round((completedFeeds.length / cn) * 10) / 10 : null;
  if (feedPerDay !== null) {
    const tagClass = feedPerDay >= REF.feedsPerDay ? "ok" : "warn";
    const text = feedPerDay >= REF.feedsPerDay ? t("insights.feedOk") : t("insights.feedLow");
    addCard(insightCard("feed", t("insights.feedTitle"), t("insights.feedBig", { n: fmtNum(feedPerDay) }),
      `${text}${completedNote}`, srcTag(pickSrc(SRC_FOR.feeds), tagClass), tagClass, "card.feedsPerDay"));
  }
  let gaps = [];
  const sorted = done.slice().sort((a, b) => a.at.localeCompare(b.at));
  for (let i = 1; i < sorted.length; i++) {
    const gap = minutesBetween(sorted[i - 1].end_at || sorted[i - 1].at, sorted[i].at);
    if (gap !== null && gap < 600) gaps.push({ gap, at: sorted[i].at });
  }
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, g) => a + g.gap, 0) / gaps.length) : null;
  const worst = gaps.length ? gaps.reduce((a, b) => (b.gap > a.gap ? b : a)) : null;
  if (worst && worst.gap > REF.feedGapWatchMin) {
    const extra = avgGap !== null ? ` ${t("insights.intervalBig", { n: avgGap })}.` : "";
    addCard(insightCard("feed", t("insights.gapTitle"), t("insights.gapBig", { n: worst.gap }),
      `${t("insights.gapSub", { t: `${worst.at.slice(5, 10)} ${fmtClock(worst.at)}` })}${extra}`, srcTag(pickSrc(SRC_FOR.feedGap), "warn"), "warn", "card.feedGap"));
  }

  // wet nappies vs NHS (S31), completed calendar days only
  const wetPerDay = cn ? csum((d) => (d.wet || 0) + (d.mixed || 0)) / cn : null;
  if (wetPerDay !== null) {
    const gate = ageDays === null || ageDays >= REF.wetFromDay;
    const ok = !gate || wetPerDay >= REF.wetPerDay;
    addCard(insightCard("diaper", t("insights.diaperTitle"), t("insights.diaperBig", { n: fmtNum(Math.round(wetPerDay * 10) / 10) }),
      `${ok ? t("insights.diaperOk") : t("insights.diaperLow")}${completedNote}`, srcTag(pickSrc(SRC_FOR.wet), ok ? "ok" : "bad"), ok ? "ok" : "bad", "card.wet"));
  }

  // stools vs NHS (S31), completed calendar days only
  const stoolPerDay = cn ? csum((d) => (d.dirty || 0) + (d.mixed || 0)) / cn : null;
  if (cn && ageDays !== null && ageDays >= REF.stoolFromDay && stoolPerDay > 0) {
    const ok = stoolPerDay >= REF.stoolPerDay;
    addCard(insightCard("diaper", t("insights.stoolTitle"), t("insights.stoolBig", { n: fmtNum(Math.round(stoolPerDay * 10) / 10) }),
      `${ok ? t("insights.stoolOk") : t("insights.stoolLow")}${completedNote}`, srcTag(pickSrc(SRC_FOR.stool), ok ? "ok" : "warn"), ok ? "ok" : "warn", "card.stool"));
  }

  // partial current day: informational only, never threshold-alarming
  if (today) {
    const wetToday = (today.wet || 0) + (today.mixed || 0);
    const stoolToday = (today.dirty || 0) + (today.mixed || 0);
    const feedsToday = done.filter((f) => f.at.slice(0, 10) === todayDate).length;
    if (wetToday || stoolToday || feedsToday || today.sleep_minutes) {
      addCard(insightCard("note", t("insights.partialTitle"),
        t("insights.partialBig", { wet: wetToday, stool: stoolToday, feeds: feedsToday }),
        t("insights.partialSub"), srcTag("tagMeasured"), "", "card.today"));
    }
  }

  let allRows = [];
  try {
    allRows = await loadEntries({ from: days[0] ? days[0].date : null, limit: 5000 });
  } catch { /* offline: skip signal analysis */ }
  const signals = analyzeSignals(allRows, completed, ageDays, ctx.nowStamp);
  if (signals.length || dismissedCount()) addCard(signalCard(signals, allRows));

  // sleep: descriptive only, no verified reference range (see SOURCES.md)
  const sleepSource = cn ? completed : (today ? [today] : []);
  const sleepHours = sleepSource.length ? sleepSource.reduce((a, d) => a + (Number(d.sleep_minutes) || 0), 0) / sleepSource.length / 60 : 0;
  if (sleepHours > 0) {
    addCard(insightCard("sleep", t("insights.sleepTitle"), t("insights.sleepBig", { h: sleepHours.toFixed(1) }),
      t("insights.sleepNoRef"), srcTag("srcUnsourced"), "", "card.sleep"));
  }

  // fever red flag (threshold not yet source-verified: [unsourced], see SOURCES.md)
  try {
    const rows = await loadEntries({ from: days[0] ? days[0].date : null, kind: "measure", limit: 2000 });
    const fever = rows.filter((r) => r.measure_kind === "temp_c" && Number.isFinite(r.value) && r.value >= REF.feverC);
    if (fever.length) {
      const worstTemp = fever.reduce((a, b) => (b.value > a.value ? b : a));
      addCard(insightCard("medication", t("insights.feverTitle"), t("insights.feverBig", { t: fmtNum(worstTemp.value) }),
        t("insights.feverSub", { d: `${worstTemp.at.slice(5, 10)} ${fmtClock(worstTemp.at)}` }), srcTag(pickSrc(SRC_FOR.fever), "bad"), "bad", "card.fever"));
    }
  } catch { /* ignore */ }

  // longest sleep stretch
  try {
    const sleepRows = await loadEntries({ from: days[0] ? days[0].date : null, kind: "sleep", limit: 2000 });
    const closed = sleepRows.filter((s) => s.end_at);
    if (closed.length) {
      const best = closed.map((s) => ({ s, m: minutesBetween(s.at, s.end_at) })).filter((x) => x.m).sort((a, b) => b.m - a.m)[0];
      const night = best.s.at.slice(11) >= "20:00" || best.s.at.slice(11) < "06:00";
      addCard(insightCard("sleep", t("insights.longestTitle"), t("insights.longestBig", { n: best.m }),
        t("insights.longestSub", { note: night ? t("insights.longestNoteNight", { t: `${best.s.at.slice(5, 10)} ${fmtClock(best.s.at)}` }) : "" }),
        srcTag("tagMeasured"), "", "card.longestSleep"));
    }
  } catch { /* ignore */ }

  // trend days: completed days, optionally auto-remove unreliable logging outliers
  const activeCompleted = completed.filter((d) => (d.wet + d.dirty + d.mixed + d.feeds + d.sleep_minutes + d.notes + d.walks + d.baths + d.medications + d.activities) > 0);
  let trendDays = activeCompleted;
  let excluded = [];
  if (trendFilterSetting() === "auto" && activeCompleted.length >= 3) {
    const score = (d) => Number(d.entry_count) || (d.feeds + d.nappies + Math.round(d.sleep_minutes / 60));
    const scores = activeCompleted.map(score).filter((v) => v > 0).sort((a, b) => a - b);
    const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;
    trendDays = activeCompleted.filter((d) => {
      const s = score(d);
      const late = d.first_at && d.first_at.slice(11) >= "12:00";
      const low = median && s < median * 0.6;
      if (low || (late && median && s < median * 0.85)) {
        excluded.push({ date: d.date, late, score: s });
        return false;
      }
      return true;
    });
  }
  if (excluded.length) {
    const days = excluded.map((x) => x.date.slice(5)).join(", ");
    addCard(insightCard("note", t("insights.excludedTitle"), t("insights.excludedBig", { n: excluded.length }),
      t("insights.excludedSub", { days }), srcTag("tagMeasured"), "warn", "card.excluded"));
  }

  // 3-day trend: completed days only
  const last3 = trendDays.slice(-3), prev3 = trendDays.slice(-6, -3);
  if (prev3.length) {
    const avg = (arr, fn) => arr.length ? arr.reduce((a, d) => a + (Number(fn(d)) || 0), 0) / arr.length : 0;
    const dFeeds = Math.round((avg(last3, (d) => d.feeds) - avg(prev3, (d) => d.feeds)) * 10) / 10;
    const dSleep = Math.round((avg(last3, (d) => d.sleep_minutes / 60) - avg(prev3, (d) => d.sleep_minutes / 60)) * 10) / 10;
    const dOut = Math.round((avg(last3, (d) => d.wet + d.dirty + d.mixed) - avg(prev3, (d) => d.wet + d.dirty + d.mixed)) * 10) / 10;
    const arrow = (v) => (v > 0 ? "↑" : v < 0 ? "↓" : "→");
    const parts = [
      `${t("insights.trendFeeds", { d: `${arrow(dFeeds)} ${Math.abs(dFeeds)}` })}`,
      `${t("insights.trendSleep", { d: `${arrow(dSleep)} ${Math.abs(dSleep)}` })}`,
      `${t("insights.trendOutput", { d: `${arrow(dOut)} ${Math.abs(dOut)}` })}`,
    ];
    const flat = Math.abs(dFeeds) < 1 && Math.abs(dSleep) < 0.7 && Math.abs(dOut) < 1.5;
    addCard(insightCard("activity", t("insights.trendTitle"), "", flat ? t("insights.trendFlat") : parts.join(" · "), srcTag("tagMeasured"), "", "card.trend"));
  }

  // record quality: completed days only
  if (completed.length) {
    const missingWeight = completed.filter((d) => d.weight_g === null || d.weight_g === undefined).length;
    const emptyDays = completed.filter((d) => (d.wet + d.dirty + d.mixed + d.feeds + d.sleep_minutes + d.notes) === 0).length;
    addCard(insightCard("note", t("insights.qualityTitle"), t("insights.qualityBig", { d: completed.length }),
      t("insights.qualitySub", { w: missingWeight, n: emptyDays }), srcTag("tagMeasured"), emptyDays ? "warn" : "ok", "card.quality"));
  }
}

/* ---------- doctor view: pediatrician questions + age-window checklist ----------
   Questions are derived from the same deterministic signals as Tips (plus a few
   always-relevant SK items); the checklist mirrors the watch-outs report
   (reports/2026-10-12-underdiscussed-newborn-watchouts.md). Not medical advice. */

function doctorQuestions(ctx, rows) {
  const q = [];
  const ageDays = ctx.ageDays;
  const completed = ctx.completed;
  const cn = completed.filter((d) => (d.wet + d.dirty + d.mixed + d.feeds + d.sleep_minutes) > 0).length;
  const csum = (fn) => completed.reduce((acc, d) => acc + (Number(fn(d)) || 0), 0);

  const signals = analyzeSignals(rows, completed, ageDays, ctx.nowStamp).concat(thresholdSignals(rows, ctx));
  const seen = new Set();
  const push = (key, params) => {
    if (seen.has(key)) return;
    seen.add(key);
    q.push(t(`doctor.${key}`, params));
  };

  for (const s of visibleSignals(signals)) {
    const p = s.params || {};
    if (s.key === "sigTempHighTitle") push("qTemp", { t: p.t, d: p.at });
    else if (s.key === "sigWeightLowTitle") push("qWeightLow", p);
    else if (s.key === "sigWeightWatchTitle") push("qWeightWatch", p);
    else if (s.key === "sigWetLowTitle") push("qWet", p);
    else if (s.key === "sigStoolLowTitle") push("qStool", p);
    else if (s.key === "sigFeedGapTitle") push("qGap", { n: p.n, d: p.at });
    else if (s.key === "sigStoolColourTitle") push("qColour", { colour: p.colour, d: p.at });
    else if (s.key === "sigMlHighTitle") push("qMl", { ml: p.ml, d: p.at, age: ageDays });
  }

  const weights = (summary && summary.weights ? summary.weights : []).filter((w) => Number.isFinite(w.value));
  if (weights.length >= 2) {
    const first = weights[0], last = weights[weights.length - 1];
    if (ageDays !== null && ageDays >= REF.regainByDays && last.value < first.value) {
      push("qRegain", { age: ageDays, last: fmtNum(last.value), first: fmtNum(first.value) });
    }
  }

  const feeds = rows.filter((r) => r.kind === "feed" && !(r.timer && !r.end_at));
  const completedFeeds = feeds.filter((f) => f.at.slice(0, 10) < ctx.todayDate);
  const feedPerDay = cn ? Math.round((completedFeeds.length / cn) * 10) / 10 : null;
  if (feedPerDay !== null && feedPerDay < REF.feedsPerDay) push("qFeedLow", { n: fmtNum(feedPerDay) });

  const vitd = rows.filter((r) => r.kind === "measure" && r.measure_kind === "vitd_iu" && Number.isFinite(r.value));
  if (vitd.length) push("qVitaminD", { iu: fmtNum(vitd[vitd.length - 1].value) });

  if (weights.length) {
    const days = new Set(weights.map((w) => w.date)).size;
    const weeks = Math.max(1, Math.round((ctx.days.length || 7) / 7));
    push("qWeightCadence", { n: Math.round((weights.length / weeks) * 10) / 10 });
    void days;
  }

  if (ageDays !== null && ageDays <= 42) {
    push("qScreening", {});
    push("qHip", {});
  }

  if (cn) {
    const mlVals = feeds.map((f) => Number(f.feed_ml)).filter((v) => Number.isFinite(v) && v > 0);
    const mlAvg = mlVals.length ? Math.round(mlVals.reduce((a, v) => a + v, 0) / mlVals.length) : null;
    const gaps = [];
    const sorted = feeds.slice().sort((a, b) => a.at.localeCompare(b.at));
    for (let i = 1; i < sorted.length; i++) {
      const gap = minutesBetween(sorted[i - 1].end_at || sorted[i - 1].at, sorted[i].at);
      if (gap !== null && gap < 600) gaps.push(gap);
    }
    const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    if (feedPerDay !== null && mlAvg !== null && avgGap !== null) {
      push("qFeeding", { n: fmtNum(feedPerDay), ml: fmtNum(mlAvg), avg: avgGap });
    }
    const sleepHours = Math.round((completed.reduce((a, d) => a + (Number(d.sleep_minutes) || 0), 0) / cn) / 6) / 10;
    const sleeps = rows.filter((r) => r.kind === "sleep" && r.end_at);
    const maxSleep = sleeps.length ? Math.max(...sleeps.map((s) => minutesBetween(s.at, s.end_at) || 0)) : 0;
    if (sleepHours > 0) push("qSleep", { h: sleepHours, max: maxSleep });
  }

  push("qParents", {});
  return q;
}

function doctorChecklist(ageDays) {
  const items = [];
  const add = (key, active) => { if (active) items.push(t(`doctor.${key}`)); };
  add("clNewborn", ageDays === null || ageDays <= 14);
  add("clScreening", ageDays === null || ageDays <= 28);
  add("clHip", ageDays === null || (ageDays >= 28 && ageDays <= 90));
  add("clVitaminD", true);
  add("clVaccines", ageDays === null || ageDays <= 90);
  add("cl6w", ageDays === null || (ageDays >= 35 && ageDays <= 90));
  add("cl3m", ageDays === null || (ageDays >= 75 && ageDays <= 150));
  add("clSolids", ageDays !== null && ageDays >= 150);
  return items;
}

async function renderDoctor() {
  const root = $("view-doctor");
  root.innerHTML = "";
  if (!summary) return;
  const ctx = insightCtx();

  root.append(h("div", { class: "card" },
    h("div", { class: "cardhead" }, h("h2", {}, t("doctor.title"))),
    h("p", { class: "muted" }, t("doctor.intro"))
  ));

  let rows = [];
  try {
    rows = await loadEntries({ from: ctx.days[0] ? ctx.days[0].date : null, limit: 5000 });
  } catch { /* offline: questions may be incomplete */ }

  const questions = doctorQuestions(ctx, rows);
  const qCard = h("div", { class: "card" },
    h("div", { class: "cardhead" },
      h("h2", {}, t("doctor.questionsTitle")),
      h("span", { class: "spacer" }),
      questions.length ? h("button", {
        type: "button", class: "mini ghost wide", "data-copyq": "1",
        onclick: async () => {
          const text = questions.map((x) => `• ${x}`).join("\n");
          try {
            await navigator.clipboard.writeText(text);
            toast(t("doctor.copied"), { icon: "check" });
          } catch { /* clipboard blocked */ }
        },
      }, t("doctor.copy")) : null
    )
  );
  if (!questions.length) {
    qCard.append(h("p", { class: "muted" }, t("doctor.questionsNone")));
  } else {
    qCard.append(h("ul", { class: "qlist" }, questions.map((x) => h("li", {}, x))));
  }
  root.append(qCard);

  const cCard = h("div", { class: "card" },
    h("div", { class: "cardhead" }, h("h2", {}, t("doctor.checklistTitle"))),
    h("ul", { class: "qlist" }, doctorChecklist(ctx.ageDays).map((x) => h("li", {}, x)))
  );
  root.append(cCard, h("p", { class: "disclaimer" }, t("doctor.srcNote")));
}

/* ---------- entry dialog ---------- */

function fieldSpec(kind, entry = null) {
  const specs = [];
  if (entry) specs.push({ name: "user", type: "select", options: meta.users, required: true });

  if (kind === "diaper") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "diaper_type", type: "seg", options: meta.diaper_types, required: true, full: true },
      { name: "diaper_colour", type: "select", options: meta.diaper_colours, optional: true },
      { name: "note", type: "text", full: true },
    );
  } else if (kind === "feed") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "feed_method", type: "seg", options: meta.feed_methods, required: !(entry && entry.timer), full: true },
      { name: "feed_minutes", type: "stepper", step: 1 },
      { name: "feed_ml", type: "stepper", step: 5 },
      { name: "swallows", type: "stepper", step: 1 },
      { name: "end_at", type: "datetime", optional: true },
      { name: "note", type: "text", full: true },
    );
  } else if (kind === "sleep" || kind === "walk" || kind === "bath") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "end_at", type: "datetime", optional: true },
      { name: "note", type: "text", full: true },
    );
  } else if (kind === "medication") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "med_name", type: "text", required: true },
      { name: "dose", type: "text" },
      { name: "note", type: "text", full: true },
    );
  } else if (kind === "activity") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "activity", type: "text", required: !(entry && entry.timer), full: true },
      { name: "end_at", type: "datetime", optional: true },
      { name: "note", type: "text", full: true },
    );
  } else if (kind === "measure") {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "measure_kind", type: "seg", options: meta.measure_kinds, required: true, full: true },
      { name: "value", type: "stepper", step: 1, required: true },
      { name: "note", type: "text", full: true },
    );
  } else {
    specs.push(
      { name: "at", type: "datetime" },
      { name: "note", type: "textarea", required: true, full: true },
    );
  }
  return specs;
}

let dialogState = null;

function optionLabel(spec, option) {
  if (spec.name === "user") return t(`users.${option}`);
  const dict = SELECT_DICT[spec.name];
  return dict ? t(`${dict}.${option}`) : option;
}

function openEntryDialog(kind, entry = null, atPreset = null) {
  const dialog = $("entryDialog");
  const body = $("sheetBody");
  const specs = fieldSpec(kind, entry);
  const values = {};
  let scaleCtl = null;

  $("sheetTitle").innerHTML = "";
  const titleIcon = h("span", { class: "qi", style: kindColorVar(kind), html: icon(KIND_ICONS[kind], "sm") });
  $("sheetTitle").append(titleIcon, document.createTextNode(entry ? t("edit") : t(`kinds.${kind}`)));

  body.innerHTML = "";
  const grid = h("div", { class: "fieldgrid" });
  for (const spec of specs) {
    const row = h("label", { class: "field" + (spec.full ? " full" : "") });
    const label = h("span", {}, t(`fields.${spec.name}`) + (spec.required ? " *" : ""));
    row.append(label);
    let input;
    if (spec.type === "select") {
      input = document.createElement("select");
      if (!spec.required) {
        const none = document.createElement("option");
        none.value = ""; none.textContent = t("none");
        input.append(none);
      }
      for (const option of spec.options) {
        const opt = document.createElement("option");
        opt.value = option; opt.textContent = optionLabel(spec, option);
        input.append(opt);
      }
    } else if (spec.type === "seg") {
      input = document.createElement("div");
      input.className = "segfield";
      input.dataset.seg = spec.name;
      input.dataset.required = spec.required ? "1" : "";
      for (const option of spec.options) {
        const btn = h("button", { type: "button", "data-seg-value": option, style: kindColorVar(kind) },
          spec.name === "feed_method" ? t(`quick_feed_methods.${option}`) : t(`${SELECT_DICT[spec.name]}.${option}`));
        btn.addEventListener("click", () => {
          input.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
          input.dataset.value = option;
        });
        input.append(btn);
      }
    } else if (spec.type === "stepper") {
      input = document.createElement("div");
      input.className = "stepper";
      const minus = h("button", { type: "button", html: "−" });
      const field = document.createElement("input");
      field.type = "text"; field.inputMode = "decimal"; field.name = spec.name;
      const plus = h("button", { type: "button", html: "+" });
      const step = spec.step || 1;
      // comma-tolerant: plain parseFloat would silently stop at the comma ("36,3" -> 36)
      const curVal = () => { const n = parseFloat(String(field.value).trim().replace(/\s+/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
      const setVal = (n) => { field.value = String(Math.round(n * 10) / 10).replace(".", String(field.value).includes(",") ? "," : "."); };
      minus.addEventListener("click", () => { setVal(Math.max(0, curVal() - step)); field.dispatchEvent(new Event("input", { bubbles: true })); });
      plus.addEventListener("click", () => { setVal(curVal() + step); field.dispatchEvent(new Event("input", { bubbles: true })); });
      input.append(minus, field, plus);
    } else if (spec.type === "datetime") {
      input = document.createElement("div");
      input.className = "datetimefield";
      const date = h("input", { type: "date", class: "date-input", "aria-label": t("fields.date") });
      const time = h("input", { type: "time", class: "time-input", step: "60", "aria-label": t("fields.time") });
      input.append(date, time);
      input._date = date;
      input._time = time;
      if (!entry) {
        if (spec.name === "at" && atPreset) {
          const [pd, pt] = splitLocal(atPreset);
          date.value = pd; time.value = pt;
        } else {
          const now = new Date();
          date.value = localDate(now);
          time.value = localTime(now);
        }
      }
    } else {
      input = document.createElement("input");
      input.type = spec.type;
      if (spec.type === "number") input.inputMode = "decimal";
      if (!entry && spec.type === "select" && spec.name === "feed_method") input.value = feedMethodDefault();
    }
    if (spec.type !== "seg" && spec.type !== "stepper" && spec.type !== "datetime") input.name = spec.name;
    values[spec.name] = { spec, input };
    if (spec.type === "datetime") {
      const now = h("button", { type: "button", class: "nowlink", onclick: () => {
        const d = new Date();
        input._date.value = localDate(d);
        input._time.value = localTime(d);
        input._date.dispatchEvent(new Event("input", { bubbles: true }));
        input._time.dispatchEvent(new Event("input", { bubbles: true }));
      } }, t("now"));
      row.append(input, now);
      if (spec.name === "end_at" && values.at) {
        const hint = h("small", { class: "hint" });
        const update = () => {
          const start = readFieldValue(values.at), end = readFieldValue(values[spec.name]);
          hint.textContent = start && end ? (minutesBetween(start, end) !== null ? fmtDuration(start, end) : t("errors.before_start")) : "";
        };
        input._date.addEventListener("input", update);
        input._time.addEventListener("input", update);
        if (values.at.input._date) {
          values.at.input._date.addEventListener("input", update);
          values.at.input._time.addEventListener("input", update);
        }
        row.append(hint);
        update();
      }
    } else {
      row.append(input);
      if (kind === "feed" && spec.name === "feed_ml") fillMilkHint(row, entry, atPreset);
    }
    const err = h("small", { class: "err" });
    row.append(err);
    grid.append(row);
  }
  body.append(grid);

  if (entry) {
    for (const spec of specs) {
      const raw = entry[spec.name];
      const { input } = values[spec.name];
      if (input.classList.contains("segfield")) {
        if (raw) {
          input.dataset.value = String(raw);
          const btn = input.querySelector(`[data-seg-value="${raw}"]`);
          if (btn) btn.classList.add("on");
        }
      } else if (input.classList.contains("stepper")) {
        const field = input.querySelector("input");
        if (raw !== null && raw !== undefined) field.value = String(raw);
      } else if (spec.type === "datetime") {
        const [date, time] = splitLocal(raw);
        input._date.value = date;
        input._time.value = time;
      } else if (raw !== null && raw !== undefined) {
        input.value = String(raw);
      }
    }
  } else {
    for (const spec of specs) {
      if (spec.type === "seg" && spec.required && spec.name === "diaper_type") {
        const first = values[spec.name].input.querySelector("button");
        first.classList.add("on");
        values[spec.name].input.dataset.value = first.dataset.segValue;
      }
      if (spec.type === "seg" && spec.name === "feed_method") {
        const val = feedMethodDefault();
        const btn = values[spec.name].input.querySelector(`[data-seg-value="${val}"]`);
        if (btn) {
          btn.classList.add("on");
          values[spec.name].input.dataset.value = val;
        }
      }
    }
  }

  if (kind === "feed" && scaleMode() !== "off") {
    scaleCtl = buildScaleSection(entry, values.feed_ml);
    body.append(scaleCtl.box);
    dialog.addEventListener("close", () => scaleCtl && scaleCtl.stashOnClose(), { once: true });
  }

  const minutesHolder = values.feed_minutes, endHolder = values.end_at;
  if (minutesHolder && endHolder && values.at) {
    const endIn = endHolder.input;
    let manualEnd = false, settingEnd = false;
    if (entry && entry.at && entry.end_at) {
      const mins = Number(entry.feed_minutes);
      const expected = new Date(entry.at);
      expected.setMinutes(expected.getMinutes() + (Number.isFinite(mins) ? mins : 0));
      manualEnd = localInput(expected) !== String(entry.end_at).slice(0, 16);
    }
    const applyDuration = () => {
      const start = readFieldValue(values.at);
      const mins = Number(readFieldValue(minutesHolder));
      if (!start || !(mins > 0)) return;
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + mins);
      settingEnd = true;
      endIn._date.value = localDate(end);
      endIn._time.value = localTime(end);
      endIn._date.dispatchEvent(new Event("input", { bubbles: true }));
      endIn._time.dispatchEvent(new Event("input", { bubbles: true }));
      settingEnd = false;
    };
    minutesHolder.input.querySelector("input").addEventListener("input", () => { manualEnd = false; applyDuration(); });
    values.at.input._date.addEventListener("input", () => { if (!manualEnd) applyDuration(); });
    values.at.input._time.addEventListener("input", () => { if (!manualEnd) applyDuration(); });
    const markManualEnd = () => { if (!settingEnd) manualEnd = true; };
    endIn._date.addEventListener("input", markManualEnd);
    endIn._time.addEventListener("input", markManualEnd);
  }

  const del = $("sheetDelete");
  del.classList.toggle("hidden", !entry);
  delete del.dataset.armed;
  del.innerHTML = icon("trash", "sm") + " " + t("delete");
  del.onclick = () => {
    if (del.dataset.armed) { deleteEntry(entry); closeSheet($("entryDialog")); dialogState = null; return; }
    del.dataset.armed = "1";
    del.textContent = t("confirmDelete2");
    setTimeout(() => { if (del.dataset.armed) { delete del.dataset.armed; del.innerHTML = icon("trash", "sm") + " " + t("delete"); } }, 3000);
  };
  $("sheetCancel").textContent = t("cancel");
  $("sheetSave").textContent = t("save");
  $("sheetClose").innerHTML = icon("x", "sm");

  dialogState = { kind, entry, specs, values, scaleCtl };
  openSheet($("entryDialog"));
  const firstInput = body.querySelector(".time-input, input, .segfield button");
  if (firstInput && !entry) setTimeout(() => firstInput.focus(), 60);
}

function readFieldValue(holder) {
  const { spec, input } = holder;
  if (spec.type === "seg") return input.dataset.value || "";
  // numeric stepper fields accept a decimal comma; send the dot form (server is tolerant too,
  // this keeps hints, duration math and the offline queue consistent)
  if (spec.type === "stepper") return input.querySelector("input").value.trim().replace(/\s+/g, "").replace(",", ".");
  if (spec.type === "datetime") return combineLocal(input._date.value, input._time.value);
  return input.value.trim();
}

function submitEntry(event) {
  event.preventDefault();
  if (!dialogState) return;
  const { kind, entry, specs, values } = dialogState;
  const method = entry ? "PUT" : "POST";
  const path = entry ? `${API.entries}/${entry.id}` : API.entries;
  const body = entry ? { kind: entry.kind } : { user, kind };
  if (entry && values.user) body.user = readFieldValue(values.user);
  for (const spec of specs) {
    if (spec.name === "user") continue;
    const raw = readFieldValue(values[spec.name]);
    if (raw !== "") body[spec.name] = raw;
    else if (entry) body[spec.name] = "";
    else if (spec.type === "datetime") body[spec.name] = raw;
  }

  if (dialogState.scaleCtl) {
    const sc = dialogState.scaleCtl;
    const badKeys = sc.fieldErrors();
    if (badKeys.length) {
      sc.markErrors(badKeys);
      toast(t("scale.badKg"), { err: true });
      return;
    }
    if (sc.state.a.g) body.scale_before_g = sc.state.a.g;
    if (sc.state.b.g) body.scale_after_g = sc.state.b.g;
    for (const f of sc.cleared()) body[f] = "";
    // both weigh-ins in but ml left empty ⇒ the milk amount is derived, always saved
    const dm = sc.derivedMl();
    if (dm !== null && !String(body.feed_ml ?? "").trim()) body.feed_ml = String(dm);
  }

  const save = $("sheetSave");
  save.disabled = true;
  (async () => {
    try {
      const data = await api(path, { method, body: JSON.stringify(body) });
      const sc2 = dialogState && dialogState.scaleCtl;
      if (sc2) {
        sc2.markSaved();
        const savedId = entry ? entry.id : (data && data.entry && data.entry.id);
        if (savedId && scaleMode() === "photo") attachScalePhotos(savedId, sc2.state).catch(() => toast(t("scale.photosFail"), { err: true }));
      }
      if (!entry) {
        user = body.user || user;
        localStorage.setItem("baby.user", user);
      }
      if (body.kind === "feed" && body.feed_method) localStorage.setItem("baby.feed_method", body.feed_method);
      closeSheet($("entryDialog"));
      dialogState = null;
      toast(t("saved"), { icon: KIND_ICONS[kind] });
      await refresh();
    } catch (error) {
      if (error.fields) {
        const scaleBad = [];
        for (const [field, code] of Object.entries(error.fields)) {
          const holder = values[field];
          if (holder && holder.input.closest(".field")) {
            holder.input.closest(".field").querySelector(".err").textContent = t(`errors.${code}`);
          } else if (field === "scale_before_g" || field === "scale_after_g") {
            scaleBad.push(field === "scale_before_g" ? "a" : "b");
            toast(t(`errors.${code}`), { err: true });
          }
        }
        if (scaleBad.length && dialogState && dialogState.scaleCtl) dialogState.scaleCtl.markErrors(scaleBad);
      } else {
        enqueue({ path, method, body });
        closeSheet($("entryDialog"));
        dialogState = null;
        showOffline();
        await refresh().catch(() => {});
      }
    } finally {
      save.disabled = false;
    }
  })();
}

function syncModalLock() {
  const anyOpen = ["entryDialog", "settingsDialog", "gridDialog", "listDialog", "ackDialog", "taskDialog", "taskEditDialog"].some((id) => $(id).open);
  if (!anyOpen) document.body.classList.remove("modal-open");
}

function openSheet(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add("modal-open");
}

function closeSheet(dialog) {
  dialog.close();
  dialog.classList.remove("dragging");
  dialog.style.setProperty("transform", "");
  syncModalLock();
}

function enableSheetDrag(dialog) {
  const head = dialog.querySelector(".sheet-head");
  let startY = null, dy = 0;
  head.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY; dy = 0;
    dialog.classList.add("dragging");
  }, { passive: true });
  head.addEventListener("touchmove", (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    dialog.style.setProperty("transform", `translateY(${dy}px)`);
  }, { passive: true });
  const end = () => {
    if (startY === null) return;
    startY = null;
    dialog.classList.remove("dragging");
    if (dy > 90) closeSheet(dialog);
    else dialog.style.setProperty("transform", "");
    dy = 0;
  };
  head.addEventListener("touchend", end);
  head.addEventListener("touchcancel", end);
}

/* ---------- settings ---------- */

function animSetting() { return localStorage.getItem("baby.anim") || "auto"; }

function applyAnim() {
  const mode = animSetting();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.dataset.anim = mode === "auto" ? (reduce ? "off" : "on") : mode;
}

// animate a node out before removing it (honours the motion setting)
function leaveNode(node) {
  if (!node) return;
  if (document.body.dataset.anim !== "on") { node.remove(); return; }
  node.style.transition = "opacity .2s ease, transform .2s ease";
  node.style.opacity = "0";
  node.style.transform = "scale(.97)";
  setTimeout(() => node.remove(), 220);
}

function themeSetting() { return localStorage.getItem("baby.theme") || "auto"; }

function applyTheme() {
  const mode = themeSetting();
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const tag = document.querySelector('meta[name="theme-color"]');
  if (tag) tag.setAttribute("content", dark ? "#0e1116" : "#f2f5f8");
}

/* ---------- family setup: caregivers + birth date (server-side settings, shared by all devices) ---------- */

function setupForm(onSaved) {
  let rows = (meta && Array.isArray(meta.users) ? meta.users : []).map((u) => ({ from: u, name: u }));
  const rowsBox = h("div", { class: "setuprows" });
  const renderRows = () => {
    rowsBox.innerHTML = "";
    for (const row of rows) {
      const inp = h("input", { type: "text", maxlength: "24", value: row.name, placeholder: t("setup.addName"), oninput: (ev) => { row.name = ev.target.value; } });
      rowsBox.append(h("div", { class: "setuprow" }, inp, rows.length > 1
        ? h("button", { type: "button", class: "mini ghost", title: t("setup.remove"), "aria-label": t("setup.remove"), html: icon("x", "sm"), onclick: () => { rows = rows.filter((r) => r !== row); renderRows(); } })
        : null));
    }
  };
  renderRows();
  const addBtn = h("button", { type: "button", class: "mini ghost wide", onclick: () => {
    if (rows.length >= 8) return;
    rows.push({ from: null, name: "" });
    renderRows();
    const inputs = rowsBox.querySelectorAll("input");
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  } }, "+ " + t("setup.add"));
  const birth = h("input", { type: "date", value: (meta && meta.birth_date) || "" });
  const saveBtn = h("button", { type: "button", class: "primary", onclick: async () => {
    const names = [...new Set(rows.map((r) => r.name.trim()).filter(Boolean))];
    if (!names.length) { toast(t("setup.needUser"), { err: true }); return; }
    const renames = rows.map((r) => ({ from: r.from, to: r.name.trim() })).filter((r) => r.from && r.to && r.from !== r.to);
    saveBtn.disabled = true;
    try {
      await api(API.settings, { method: "POST", body: JSON.stringify({ users: names, renames, birth_date: birth.value }) });
      await loadMeta();
      await refresh();
      toast(t("setup.saved"), { icon: "check" });
      if (onSaved) onSaved();
    } catch (e) {
      const field = e.fields && (e.fields.users || e.fields.birth_date || e.fields.renames);
      toast(field ? `${t("setup.badRejected")} (${field})` : t("setup.failed"), { err: true });
    } finally { saveBtn.disabled = false; }
  } }, t("setup.save"));
  return { rowsBox, addBtn, birth, saveBtn };
}

// Settings-sheet section (re-opened after save so the fields show stored values)
function setupBlock() {
  const f = setupForm(() => openSettings());
  return h("div", { class: "setupblock" },
    h("div", { class: "setrow nomask" }, h("span", { class: "lbl" }, h("b", {}, t("setup.users")), h("small", {}, `${t("setup.renameNote")} ${t("setup.removedNote")}`))),
    f.rowsBox, f.addBtn,
    h("div", { class: "setrow nomask" }, h("span", { class: "lbl" }, h("b", {}, t("setup.birth")), h("small", {}, t("setup.birthSub"))), f.birth),
    f.saveBtn);
}

// First-run card on Today (only while meta.setup_needed; saving refreshes the view)
function setupCard() {
  const f = setupForm(null);
  return h("section", { class: "card setup-first" },
    h("div", { class: "cardhead" }, h("h2", {}, t("setup.title"))),
    h("p", { class: "muted setupsub" }, t("setup.sub")),
    f.rowsBox, f.addBtn,
    h("div", { class: "setupbirth" }, h("span", { class: "muted" }, t("setup.birth")), f.birth),
    f.saveBtn);
}

function openSettings() {
  $("settingsTitle").textContent = t("settings.title");
  $("settingsClose").innerHTML = icon("x", "sm");
  const body = $("settingsBody");
  body.innerHTML = "";
  const remind = reminderSettings();

  const seg = (options, current, onpick) => h("div", { class: "seg" }, ...options.map(([value, label]) => h("button", {
    type: "button", class: value === current ? "on" : "", onclick: () => onpick(value),
  }, label)));

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.language"))),
    seg([["sk", "Slovenčina"], ["en", "English"]], lang, (v) => { lang = v; localStorage.setItem("baby.lang", v); applyTheme(); renderAll(); openSettings(); })
  ));

  body.append(setupBlock());

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.theme"))),
    seg([["auto", t("settings.themeAuto")], ["dark", t("settings.themeDark")], ["light", t("settings.themeLight")]], themeSetting(),
      (v) => { localStorage.setItem("baby.theme", v); applyTheme(); openSettings(); })
  ));

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.anim")), h("small", {}, t("settings.animSub"))),
    seg([["auto", t("settings.animAuto")], ["on", t("settings.animOn")], ["off", t("settings.animOff")]], animSetting(),
      (v) => { localStorage.setItem("baby.anim", v); applyAnim(); openSettings(); })
  ));

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.scale")), h("small", {}, t("settings.scaleSub"))),
    seg([["photo", t("settings.scalePhoto")], ["manual", t("settings.scaleManual")], ["off", t("settings.scaleOff")]], scaleMode(),
      (v) => { localStorage.setItem("baby.scaleMode", v); openSettings(); })
  ));

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.qkTitle")), h("small", {}, t("settings.qkSub"))),
    h("button", { type: "button", class: "mini ghost wide", onclick: openGridEditor }, t("settings.qkEdit"))
  ));

  const srcOffs = srcOffList();
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.sources")), h("small", {}, t("settings.sourcesSub"))),
    srcOffs.length ? h("button", { type: "button", class: "mini ghost wide", onclick: () => { localStorage.setItem("baby.srcOff", "[]"); openSettings(); refresh().catch(() => {}); } }, t("settings.sourcesAll")) : null
  ));
  for (const id of Object.keys(SOURCES)) {
    const on = srcOn(id);
    const cb = h("input", { type: "checkbox", onchange: () => {
        const cur = srcOffList();
        if (on) cur.push(id);
        else { const i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); }
        localStorage.setItem("baby.srcOff", JSON.stringify(cur));
        openSettings(); refresh().catch(() => {});
      } });
    cb.checked = on;
    body.append(h("label", { class: "srcrow" + (on ? "" : " off") },
      cb,
      h("span", {}, `${id} · ${t(SOURCES[id].label)}`),
      h("em", {}, SOURCES[id].region)
    ));
  }

  const llmCur = llmCfg || { provider: "off", base_url: "", model: "", has_key: false };
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.llm")), h("small", {}, t("settings.llmSub"))),
    seg([["off", t("settings.llmOff")], ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["custom", t("settings.llmCustom")]], llmCur.provider,
      async (v) => {
        try { const d = await api(API.llm, { method: "POST", body: JSON.stringify({ provider: v }) }); llmCfg = d.llm; openSettings(); }
        catch { /* offline: keep current view */ }
      })
  ));
  if (llmCur.provider !== "off") body.append(llmSetupRow());

  const trendFilter = trendFilterSetting();
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.trends")), h("small", {}, t("settings.trendsSub"))),
    seg([["auto", t("settings.trendAuto")], ["all", t("settings.trendAll")]], trendFilter,
      (v) => { localStorage.setItem("baby.trendFilter", v); openSettings(); })
  ));

  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("tasks.calendar")), h("small", {}, t("tasks.calendarSub"))),
    h("a", { class: "ghost", href: "/calendar.ics", download: "" }, t("tasks.calendar"))
  ));

  const remindRow = h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.remind")), h("small", {}, t("settings.remindSub"))),
    h("button", {
      type: "button", class: "switch" + (remind.on ? " on" : ""), "aria-label": t("settings.remind"),
      onclick: async (ev) => {
        const on = !remind.on;
        if (on && "Notification" in window && Notification.permission === "default") {
          try { await Notification.requestPermission(); } catch { /* ignore */ }
        }
        localStorage.setItem("baby.remind", JSON.stringify({ on, minutes: remind.minutes }));
        openSettings();
      },
    })
  );
  body.append(remindRow);
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.remindEvery"))),
    h("div", { class: "stepper" },
      h("button", { type: "button", html: "−", onclick: () => { remind.minutes = Math.max(30, remind.minutes - 15); localStorage.setItem("baby.remind", JSON.stringify(remind)); openSettings(); } }),
      h("input", { type: "text", value: String(remind.minutes), readonly: "readonly" }),
      h("button", { type: "button", html: "+", onclick: () => { remind.minutes = Math.min(360, remind.minutes + 15); localStorage.setItem("baby.remind", JSON.stringify(remind)); openSettings(); } })
    )
  ));
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.test")), h("small", {}, "Notification API")),
    h("button", { type: "button", class: "ghost", onclick: () => notify(t("nextFeedDue")) }, t("settings.test"))
  ));

  const queue = queued().length;
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.queue")), h("small", {}, queue ? `${queue}` : t("settings.queueEmpty"))),
    queue ? h("button", { type: "button", class: "ghost", html: icon("refresh", "sm") + " " + t("retry"), onclick: async () => { await flushQueue(); openSettings(); await refresh(); } }) : null
  ));
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.export"))),
    h("a", { class: "ghost", href: "/export.csv", download: "" }, t("settings.export"))
  ));
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.cert"))),
    h("a", { class: "ghost", href: "/ca.crt" }, t("settings.cert"))
  ));
  const ignoredCount = dismissedCount();
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.ignored")),
      h("small", {}, `${t("settings.ignoredSub")}${ignoredCount ? ` · ${ignoredCount}` : ""}`)),
    ignoredCount ? h("button", { type: "button", class: "ghost", onclick: openIgnoredList }, t("settings.ignoredOpen")) : null
  ));
  body.append(h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.version")),
      h("small", {}, meta ? `v${meta.version} · ${meta.server_time}` : ""))
  ));

  openSheet($("settingsDialog"));
}

/* ---------- Today-card grid editor (tiles, groups, gaps) ---------- */

// Pointer-based sortable rows (mouse + touch). Rows carry data-id; the final order
// is read from the DOM on drop. Keyboard: grip buttons handle ↑/↓ themselves.
function makeSortable(list, onReorder) {
  let drag = null, pid = null, anchorY = 0;
  const rows = () => Array.prototype.slice.call(list.children).filter((el) => el.dataset.id);
  list.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest("[data-drag]");
    if (!handle || (e.pointerType === "mouse" && e.button !== 0)) return;
    const row = handle.closest(".grow");
    if (!row || row.parentElement !== list) return;
    drag = row; pid = e.pointerId; anchorY = e.clientY;
    row.classList.add("dragging");
    handle.setPointerCapture(pid);
    e.preventDefault();
  });
  list.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== pid) return;
    const dy = e.clientY - anchorY;
    drag.style.transform = `translateY(${dy}px)`;
    let ref = null; // first row whose midpoint sits below the pointer → insert before it
    for (const el of rows()) {
      if (el === drag) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { ref = el; break; }
    }
    if (ref !== drag.nextElementSibling) {
      const beforeTop = drag.getBoundingClientRect().top - dy;
      list.insertBefore(drag, ref);
      anchorY += (drag.getBoundingClientRect().top - dy) - beforeTop; // keep the row pinned under the pointer
      drag.style.transform = `translateY(${e.clientY - anchorY}px)`;
    }
  });
  const end = (e) => {
    if (!drag || e.pointerId !== pid) return;
    drag.classList.remove("dragging");
    drag.style.transform = "";
    drag = null; pid = null;
    onReorder(rows().map((el) => el.dataset.id));
  };
  list.addEventListener("pointerup", end);
  list.addEventListener("pointercancel", end);
}

function openGridEditor() {
  $("gridTitle").textContent = t("settings.gridTitle");
  $("gridClose").innerHTML = icon("x", "sm");
  const body = $("gridBody");
  body.innerHTML = "";
  body.append(h("p", { class: "hint" }, t("settings.gridSub")));

  const moveQuick = (id, dir) => {
    const order = quickOrder();
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    localStorage.setItem("baby.quickOrder", JSON.stringify(order));
    openGridEditor(); renderToday();
  };
  const dropQuick = (id) => {
    localStorage.setItem("baby.quickOrder", JSON.stringify(quickOrder().filter((x) => x !== id)));
    if (isQGrp(id)) saveQuickGroups(quickGroups().filter((g) => `g:${g.uid}` !== id));
    else if (!id.includes(":")) saveQuickDefs(quickDefs().filter((x) => x.uid !== id));
    openGridEditor(); renderToday();
  };

  const listWrap = h("div", { class: "gridlist" });
  for (const id of quickOrder()) {
    const on = qOn(id);
    const isCustom = !id.includes(":");
    const special = isQGap(id) || isQGrp(id);
    const flip = () => {
      const cur = qOff();
      if (cur.includes(id)) cur.splice(cur.indexOf(id), 1); else cur.push(id);
      localStorage.setItem("baby.quickOff", JSON.stringify(cur));
      openGridEditor(); renderToday();
    };
    const cb = h("input", { type: "checkbox", "aria-label": qLabel(id), onchange: flip });
    cb.checked = on;
    const labelKid = isQGrp(id)
      ? h("input", { class: "grpname", type: "text", maxlength: "24", value: qLabel(id), "aria-label": t("settings.qkGroupPh"),
          onchange: (ev) => {
            const gs = quickGroups();
            const g = gs.find((x) => `g:${x.uid}` === id);
            if (g) { g.name = ev.currentTarget.value.trim(); saveQuickGroups(gs); }
            openGridEditor(); renderToday();
          } })
      : h("span", { class: "glabel", onclick: flip }, qLabel(id));
    listWrap.append(h("div", { class: "grow" + (on ? "" : " off") + (isQGrp(id) ? " grp" : ""), "data-id": id },
      cb,
      labelKid,
      qPill(id) ? h("em", {}, qPill(id)) : null,
      h("button", { type: "button", class: "grip", "data-drag": "1", title: t("settings.qkDrag"), "aria-label": t("settings.qkDrag"), html: icon("grip", "sm"),
        onkeydown: (e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); moveQuick(id, -1); }
          else if (e.key === "ArrowDown") { e.preventDefault(); moveQuick(id, 1); }
        } }),
      isCustom || special ? h("button", { type: "button", class: "mini ghost", title: t("settings.qkDel"), "aria-label": t("settings.qkDel"), onclick: () => dropQuick(id), html: icon("x", "sm") }) : null
    ));
  }
  body.append(listWrap);
  makeSortable(listWrap, (ids) => {
    localStorage.setItem("baby.quickOrder", JSON.stringify(ids));
    renderToday();
  });

  if (qOff().length) body.append(h("div", { class: "rowbtns" },
    h("button", { type: "button", class: "mini ghost wide", onclick: () => { localStorage.setItem("baby.quickOff", "[]"); openGridEditor(); renderToday(); } }, t("settings.sourcesAll"))));

  body.append(h("p", { class: "flabel" }, t("settings.qkGroups")), h("p", { class: "hint" }, t("settings.qkGroupsSub")));
  const grpName = h("input", { type: "text", maxlength: "24", placeholder: t("settings.qkGroupPh"), "aria-label": t("settings.qkGroupPh") });
  body.append(h("div", { class: "fieldrow" }, grpName,
    h("button", { type: "button", class: "btn ghost", onclick: () => {
      const name = grpName.value.trim();
      if (!name) return;
      const uid = newQuickUid();
      saveQuickGroups([...quickGroups(), { uid, name }]);
      const o = quickOrder();
      o.push(`g:${uid}`);
      localStorage.setItem("baby.quickOrder", JSON.stringify(o));
      openGridEditor(); renderToday();
    } }, t("settings.qkGroupAdd")),
    h("button", { type: "button", class: "btn ghost", onclick: () => {
      const o = quickOrder();
      o.push(`sp:${newQuickUid()}`);
      localStorage.setItem("baby.quickOrder", JSON.stringify(o));
      openGridEditor(); renderToday();
    } }, t("settings.qkGapAdd"))));

  body.append(h("p", { class: "flabel" }, t("settings.qkAddSub")));
  let qType = "med";
  let qIcon = "";
  let qPausable = false;
  const medName = h("input", { type: "text", placeholder: t("settings.qkMedPh"), maxlength: "40" });
  const medDose = h("input", { type: "text", placeholder: t("settings.qkDosePh"), maxlength: "20", disabled: "" });
  const pauseChk = h("input", { type: "checkbox", onchange: () => { qPausable = pauseChk.checked; } });
  const pauseWrap = h("label", { class: "chkrow hidden" }, pauseChk, h("span", {}, t("settings.qkPausable")));
  const Q_ICON_CHOICES = ["star", "heart", "sun", "moon", "walk", "bath", "bottle", "pill", "note", "clock"];
  const iconRow = h("div", { class: "iconchips" }, ...Q_ICON_CHOICES.map((ic) => h("button", {
    type: "button", class: "icchip", "data-quick-icon": ic, title: ic, html: icon(ic, "sm"),
    onclick: () => {
      qIcon = qIcon === ic ? "" : ic;
      iconRow.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.getAttribute("data-quick-icon") === qIcon));
    },
  })));
  const typeSeg = h("div", { class: "seg" },
    h("button", { type: "button", class: "on", onclick: (ev) => { qType = "med"; setTypeBtn(ev.currentTarget); medDose.disabled = false; } }, t("settings.qkTypeMed")),
    h("button", { type: "button", onclick: (ev) => { qType = "act"; setTypeBtn(ev.currentTarget); medDose.disabled = true; } }, t("settings.qkTypeAct"))
  );
  const setTypeBtn = (btn) => {
    typeSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
    medName.placeholder = t(qType === "med" ? "settings.qkMedPh" : "settings.qkActPh");
    pauseWrap.classList.toggle("hidden", qType !== "act");
  };
  body.append(h("div", { class: "fieldrow" }, typeSeg, medName, medDose));
  body.append(h("div", { class: "fieldrow" }, pauseWrap, iconRow));
  body.append(h("div", { class: "rowbtns" }, h("button", { type: "button", class: "btn primary", onclick: () => {
    const name = medName.value.trim();
    if (!name) return;
    const list = quickDefs();
    const def = { uid: newQuickUid(), type: qType, name, dose: qType === "med" ? medDose.value.trim() : "" };
    if (qIcon) def.icon = qIcon;
    if (qType === "act" && qPausable) def.pausable = true;
    list.push(def);
    saveQuickDefs(list);
    openGridEditor(); renderToday();
  } }, t("settings.qkAdd"))));

  openSheet($("gridDialog"));
}

/* ---------- LLM endpoint setup (address → test → model dropdown) ---------- */

let llmModelList = []; // models pulled from the endpoint by the last Test / Detect (kept while the sheet stays open)

function llmSetupRow() {
  const cur = llmCfg || { provider: "off", base_url: "", model: "", has_key: false };
  const status = h("small", { class: "hint" });
  const base = h("input", { type: "text", inputmode: "url", placeholder: "http://127.0.0.1:11434/v1", value: cur.base_url || "", onchange: () => saveLlm({}) });
  const modelIn = h("input", { type: "text", placeholder: t("settings.llmModelPh"), value: cur.model || "", onchange: () => { fillSel(); saveLlm({}); } });
  const key = h("input", { type: "password", autocomplete: "new-password", placeholder: cur.has_key ? t("settings.llmKeyKeep") : t("settings.llmKeyPh"), onchange: () => saveLlm({}) });
  const modelSel = h("select", { "aria-label": t("settings.llmModelPh"), onchange: () => { if (!modelSel.disabled) { modelIn.value = modelSel.value; saveLlm({}); } } });
  async function saveLlm(extra) {
    const patch = Object.assign({ provider: (llmCfg || { provider: "off" }).provider, base_url: base.value.trim(), model: modelIn.value.trim() }, extra);
    if (key.value) { patch.api_key = key.value; key.value = ""; }
    try { const d = await api(API.llm, { method: "POST", body: JSON.stringify(patch) }); llmCfg = d.llm; status.textContent = ""; return true; }
    catch { status.textContent = t("settings.llmSaveFail"); return false; }
  }
  function fillSel() {
    const value = modelIn.value.trim();
    modelSel.innerHTML = "";
    if (!llmModelList.length && !value) {
      modelSel.append(h("option", {}, t("settings.llmPick")));
      modelSel.disabled = true;
      return;
    }
    for (const m of [...new Set((value ? [value] : []).concat(llmModelList))]) {
      const opt = h("option", { value: m }, m);
      opt.selected = m === value;
      modelSel.append(opt);
    }
    modelSel.disabled = false;
  }
  fillSel();

  const btnTest = h("button", { type: "button", class: "mini wide", onclick: async () => {
    status.textContent = t("settings.llmTesting");
    if (!(await saveLlm({}))) return;
    let d = await api(`${API.llm}/models`, { method: "POST", body: "{}" }).catch(() => null);
    if (!d || !d.ok) { status.textContent = `${t("settings.llmTestFail")} ${(d && d.error) || ""}`; return; }
    llmModelList = Array.isArray(d.models) ? d.models : [];
    if (llmModelList.length && !modelIn.value.trim()) { modelIn.value = llmModelList[0]; await saveLlm({}); }
    fillSel();
    if (!llmModelList.length) { status.textContent = t("settings.llmNoModels"); return; }
    let msg = t("settings.llmModelsOk", { n: llmModelList.length });
    status.textContent = `${msg} · ${t("settings.llmTesting")}`;
    const t2 = await api(`${API.llm}/test`, { method: "POST", body: "{}" }).catch(() => null);
    msg += t2 && t2.ok ? ` · ${t("settings.llmTestOk")} ${t2.reply} (${t2.ms} ms)` : ` · ${t("settings.llmTestFail")} ${(t2 && t2.error) || ""}`;
    status.textContent = msg;
  } }, t("settings.llmTest"));
  const btnDetect = h("button", { type: "button", class: "mini ghost wide", onclick: async () => {
    status.textContent = t("settings.llmTesting");
    const d = await api(`${API.llm}/detect`, { method: "POST", body: "{}" }).catch(() => null);
    if (!d || !d.found.length) { status.textContent = t("settings.llmNone"); return; }
    base.value = d.base_url;
    llmModelList = d.found;
    if (!modelIn.value) modelIn.value = d.found[0];
    await saveLlm({});
    fillSel();
    status.textContent = t("settings.llmDetected", { n: d.found.length });
  } }, t("settings.llmDetect"));

  return h("div", { class: "setrow" },
    h("span", { class: "lbl" }, h("b", {}, t("settings.llmSetup")), h("small", {}, t("settings.llmSteps"))),
    h("div", { class: "full" },
      h("div", { class: "fieldrow" }, base, btnTest, btnDetect),
      h("div", { class: "fieldrow" }, modelSel, modelIn),
      key,
      status,
      h("small", { class: "hint" }, t("settings.llmNote")))
  );
}

async function notify(text) {
  if (!("Notification" in window)) { toast(t("settings.noNotif"), { err: true, icon: "bell" }); return; }
  if (Notification.permission === "granted") {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(t("title"), { body: text, tag: "baby-feed" });
      else new Notification(t("title"), { body: text, tag: "baby-feed" });
    } catch { new Notification(t("title"), { body: text, tag: "baby-feed" }); }
  } else {
    toast(t("settings.noNotif"), { err: true, icon: "bell" });
  }
}

/* ---------- render orchestration ---------- */

function renderView() {
  for (const name of VIEWS) $("view-" + name).classList.toggle("hidden", name !== view);
  if (view === "today") renderToday();
  else if (view === "log") renderLog();
    else if (view === "stats") renderStats();
    else if (view === "kontrola") renderKontrola();
    else if (view === "insights") renderInsights();
  else if (view === "doctor") renderDoctor();
}

function renderAll() {
  renderHeader();
  renderNav();
  renderView();
}

function showOffline() { $("offlineNote").classList.remove("hidden"); }

async function loadTasks() {
  try {
    const day = isoDay(new Date());
    const [t, c] = await Promise.all([api(API.tasks), api(`${API.taskCheckins}?from=${day}&to=${day}`)]);
    tasks = t.tasks || [];
    taskCheckins = c.checkins || [];
  } catch { /* offline: reminders may be stale */ }
}

async function refresh() {
  await Promise.all([loadSummary(), loadTasks(), (async () => {
    if (view === "today") {
      try {
        const rows = await loadEntries({ from: isoDay(new Date()), kind: "feed", limit: 50 });
        const done = rows.filter((r) => !(r.timer && !r.end_at));
        lastFeedAt = done.length ? done[0].end_at || done[0].at : null;
      } catch { lastFeedAt = null; }
    }
  })()]);
  renderLiveBar();
  if (view === "today") renderToday();
  else if (view === "kontrola") renderKontrola();
  else if (view === "stats") { drawChart(); drawTable(); }
  else if (view === "insights") renderInsights();
  else if (view === "log") fillLog(document.querySelector("#view-log .card.pad0"), document.querySelector("#view-log .loadmore"));
  $("offlineNote").classList.toggle("hidden", queued().length === 0);
  checkReminder();
}

function checkReminder() {
  const remind = reminderSettings();
  if (!remind.on || !lastFeedAt) return;
  const mins = minutesBetween(lastFeedAt, localInput(new Date()));
  if (mins === null || mins < remind.minutes) return;
  const now = Date.now();
  if (now - remindedAt < remind.minutes * 60000) return;
  remindedAt = now;
  notify(`${t("nextFeedDue")} · ${t("nextFeed")} ${fmtClock(lastFeedAt)}`);
}

async function init() {
  applyTheme();
  applyAnim();
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => { if (animSetting() === "auto") applyAnim(); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  window.addEventListener("resize", measureTopbar);
  document.fonts && document.fonts.ready.then(measureTopbar);
  window.addEventListener("hashchange", () => {
    const name = (location.hash || "").replace("#", "");
    if (VIEWS.includes(name) && name !== view) { view = name; localStorage.setItem("baby.view", name); renderNav(); renderView(); }
  });

  $("langBtn").onclick = () => {
    lang = lang === "sk" ? "en" : "sk";
    localStorage.setItem("baby.lang", lang);
    renderAll();
  };
  $("settingsBtn").onclick = openSettings;
  $("settingsClose").onclick = () => closeSheet($("settingsDialog"));
  $("gridClose").onclick = () => closeSheet($("gridDialog"));
  $("sheetClose").onclick = () => closeSheet($("entryDialog"));
  $("sheetCancel").onclick = () => closeSheet($("entryDialog"));
  $("listClose").onclick = () => closeSheet($("listDialog"));
  $("ackClose").onclick = () => closeSheet($("ackDialog"));
  $("ackCancel").onclick = () => closeSheet($("ackDialog"));
  $("ackSave").onclick = saveAck;
  $("taskClose").onclick = () => closeSheet($("taskDialog"));
  $("taskEditClose").onclick = () => closeSheet($("taskEditDialog"));
  $("taskEditCancel").onclick = () => closeSheet($("taskEditDialog"));
  $("taskEditForm").addEventListener("submit", submitTaskEdit);
  $("entryForm").addEventListener("submit", submitEntry);
  for (const id of ["entryDialog", "settingsDialog", "gridDialog", "listDialog", "ackDialog", "taskDialog", "taskEditDialog"]) {
    const dlg = $(id);
    dlg.addEventListener("click", (event) => { if (event.target === dlg) closeSheet(dlg); });
    dlg.addEventListener("cancel", () => {
      requestAnimationFrame(() => { dlg.classList.remove("dragging"); dlg.style.setProperty("transform", ""); syncModalLock(); });
    });
    enableSheetDrag(dlg);
  }

  try {
    await flushQueue();
    await loadMeta();
    loadLlm();
  } catch {
    showOffline();
    renderHeader();
    renderNav();
    return;
  }
  renderAll();
  await refresh();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  setInterval(() => refresh().catch(() => {}), 120000);
}

init();
