const logic = require("./wc26-logic.js");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${message}`);
    return;
  }

  passed += 1;
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

const {
  canonicalName,
  matchKey,
  isLiveMatch,
  isFinishedMatch,
  isUpcomingOrLiveMatch,
  preferLiveEvent,
  getStandingsScores,
  getLiveDisplayScores,
  resolveCenterMatch,
  transitionLiveCenterState
} = logic;

assertEqual(canonicalName("Türkiye"), "Turkey", "canonicalName Türkiye");
assertEqual(canonicalName("Curaçao"), "Curacao", "canonicalName Curaçao");

const utcA = "2026-06-14T04:00:00Z";
const utcB = "2026-06-14T04:00Z";
assertEqual(
  matchKey("Australia", "Turkey", utcA),
  matchKey("Australia", "Turkey", utcB),
  "matchKey ignores utc format differences"
);

const liveMatch = {
  home: "Australia",
  away: "Turkey",
  utc: utcA,
  statusState: "in",
  inProgress: true,
  completed: false,
  homeScore: 2,
  awayScore: 0,
  rawHomeScore: 2,
  rawAwayScore: 0
};

const finishedMatch = {
  ...liveMatch,
  statusState: "post",
  inProgress: false,
  completed: true,
  rawInProgress: false
};

const upcomingMatch = {
  home: "Germany",
  away: "Curacao",
  utc: "2026-06-14T17:00:00Z",
  statusState: "pre",
  inProgress: false,
  completed: false,
  homeScore: null,
  awayScore: null
};

assert(isLiveMatch(liveMatch), "live match detected");
assert(!isLiveMatch(finishedMatch), "finished match is not live");
assert(isFinishedMatch(finishedMatch), "finished match detected");
assert(isUpcomingOrLiveMatch(upcomingMatch, Date.parse("2026-06-14T12:00:00Z")), "upcoming match in list");
assert(!isUpcomingOrLiveMatch(finishedMatch, Date.now()), "finished match not in upcoming list");

assert(
  preferLiveEvent(
    { statusState: "in", utc: utcA, completed: false },
    { statusState: "pre", utc: utcA, completed: false }
  ),
  "prefer live event over scheduled"
);

assertEqual(
  getStandingsScores({ statusState: "pre", inProgress: false, completed: false, homeScore: 0, awayScore: 0 }),
  null,
  "pre-match 0-0 excluded from standings"
);

assertEqual(
  getStandingsScores({ statusState: "post", inProgress: false, completed: true, homeScore: 2, awayScore: 1 }).home,
  2,
  "finished match counted in standings"
);

assertEqual(
  getLiveDisplayScores({
    statusState: "in",
    inProgress: true,
    homeScore: 1,
    awayScore: 0,
    rawHomeScore: 2,
    rawAwayScore: 0
  }).home,
  2,
  "live board uses raw scores"
);

const matches = [liveMatch, upcomingMatch];
const lookup = new Map([
  [matchKey(liveMatch.home, liveMatch.away, liveMatch.utc), liveMatch],
  [matchKey(upcomingMatch.home, upcomingMatch.away, upcomingMatch.utc), upcomingMatch]
]);

const autoCenter = resolveCenterMatch({
  matches,
  centerMatchKey: "",
  centerMatchPinned: false,
  liveMatch,
  getMatchByKey: (key) => lookup.get(key) || null
});
assert(isLiveMatch(autoCenter.match), "auto center prefers live");

const pinnedCenter = resolveCenterMatch({
  matches,
  centerMatchKey: matchKey(upcomingMatch.home, upcomingMatch.away, upcomingMatch.utc),
  centerMatchPinned: true,
  liveMatch,
  getMatchByKey: (key) => lookup.get(key) || null
});
assertEqual(pinnedCenter.match.home, "Germany", "pinned upcoming kept during live");

const finishedKey = matchKey(finishedMatch.home, finishedMatch.away, finishedMatch.utc);
lookup.set(finishedKey, finishedMatch);

const afterLive = resolveCenterMatch({
  matches: [upcomingMatch],
  centerMatchKey: finishedKey,
  centerMatchPinned: true,
  liveMatch: null,
  getMatchByKey: (key) => lookup.get(key) || null
});
assertEqual(afterLive.match.home, "Germany", "after live ends, next match shown");
assert(!afterLive.centerMatchPinned, "finished pin cleared");

const transition = transitionLiveCenterState(
  {
    centerMatchKey: finishedKey,
    centerMatchPinned: true,
    trackingLiveCenterKey: finishedKey
  },
  null
);
assertEqual(transition.centerMatchKey, "", "live transition clears finished pin");
assertEqual(transition.trackingLiveCenterKey, "", "tracking key cleared");

if (failed > 0) {
  console.error(`\nWC26 logic checks: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`WC26 logic checks: ${passed} passed`);
