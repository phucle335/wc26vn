(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.WC26Logic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const liveNameAliases = {
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Cape Verde": "Cabo Verde",
    "Congo DR": "DR Congo",
    "Curaçao": "Curacao",
    "South Korea": "Korea Republic",
    "Türkiye": "Turkey",
    USA: "United States",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina"
  };

  function canonicalName(name) {
    return liveNameAliases[name] || name;
  }

  function matchKey(home, away, utc) {
    const teams = [canonicalName(home), canonicalName(away)].sort().join("|");
    return `${Date.parse(utc)}|${teams}`;
  }

  function isLiveMatch(match) {
    if (!match) {
      return false;
    }

    if (match.statusState === "post") {
      return false;
    }

    const completed = !!(match.rawCompleted ?? match.completed);
    const active = !!(match.inProgress || match.rawInProgress || match.statusState === "in");

    if (completed && !active) {
      return false;
    }

    return active;
  }

  function isFinishedMatch(match) {
    return !!match && !isLiveMatch(match) && !!(match.rawCompleted ?? match.completed);
  }

  function isUpcomingOrLiveMatch(match, now) {
    if (isLiveMatch(match)) {
      return true;
    }

    if (match.rawCompleted ?? match.completed) {
      return false;
    }

    return Date.parse(match.utc) > now;
  }

  function preferLiveEvent(candidate, existing) {
    if (!existing) {
      return true;
    }

    const candidateLive = candidate.statusState === "in";
    const existingLive = existing.statusState === "in";
    if (candidateLive !== existingLive) {
      return candidateLive;
    }

    const candidateDone = candidate.statusState === "post" || candidate.completed;
    const existingDone = existing.statusState === "post" || existing.completed;
    if (candidateDone !== existingDone) {
      return candidateDone;
    }

    return Date.parse(candidate.utc) >= Date.parse(existing.utc);
  }

  function getStandingsScores(match) {
    const liveOrDone = match.statusState === "in"
      || match.statusState === "post"
      || match.inProgress
      || match.completed;

    if (!liveOrDone) {
      return null;
    }

    if (match.homeScore === null || match.awayScore === null) {
      return null;
    }

    return { home: match.homeScore, away: match.awayScore };
  }

  function getLiveDisplayScores(match) {
    const home = isLiveMatch(match)
      ? (match.rawHomeScore ?? match.homeScore)
      : match.homeScore;
    const away = isLiveMatch(match)
      ? (match.rawAwayScore ?? match.awayScore)
      : match.awayScore;

    if (home !== null && away !== null) {
      return { home, away };
    }

    return { home: 0, away: 0 };
  }

  function resolveCenterMatch(input) {
    const {
      matches,
      centerMatchKey: initialKey,
      centerMatchPinned: initialPinned,
      liveMatch,
      getMatchByKey
    } = input;

    let centerMatchKey = initialKey;
    let centerMatchPinned = initialPinned;

    if (centerMatchKey) {
      const current = getMatchByKey(centerMatchKey);
      if (!current || isFinishedMatch(current)) {
        centerMatchPinned = false;
        centerMatchKey = "";
      }
    }

    if (centerMatchPinned && centerMatchKey) {
      const pinned = getMatchByKey(centerMatchKey)
        || matches.find((match) => matchKey(match.home, match.away, match.utc) === centerMatchKey);

      if (pinned && !isFinishedMatch(pinned)) {
        return { match: pinned, centerMatchKey, centerMatchPinned };
      }

      centerMatchPinned = false;
      centerMatchKey = "";
    }

    if (liveMatch) {
      centerMatchKey = matchKey(liveMatch.home, liveMatch.away, liveMatch.utc);
      return { match: liveMatch, centerMatchKey, centerMatchPinned };
    }

    if (centerMatchKey) {
      const selected = matches.find((match) => matchKey(match.home, match.away, match.utc) === centerMatchKey);
      if (selected) {
        return { match: selected, centerMatchKey, centerMatchPinned };
      }

      centerMatchKey = "";
    }

    return {
      match: matches[0] || null,
      centerMatchKey,
      centerMatchPinned
    };
  }

  function transitionLiveCenterState(state, liveMatch) {
    const liveKey = liveMatch ? matchKey(liveMatch.home, liveMatch.away, liveMatch.utc) : "";
    let { centerMatchKey, centerMatchPinned, trackingLiveCenterKey } = state;

    if (trackingLiveCenterKey && !liveKey) {
      if (!centerMatchPinned || centerMatchKey === trackingLiveCenterKey) {
        centerMatchPinned = false;
        centerMatchKey = "";
      }
    }

    return {
      centerMatchKey,
      centerMatchPinned,
      trackingLiveCenterKey: liveKey
    };
  }

  return {
    liveNameAliases,
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
  };
});
