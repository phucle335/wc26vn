(function (root) {
  function createSelfHeal(deps) {
    const history = [];
    const maxHistory = 20;

    function record(checkId, ok, detail, fixed) {
      history.unshift({
        at: new Date().toISOString(),
        checkId,
        ok,
        detail,
        fixed
      });
      history.length = Math.min(history.length, maxHistory);
    }

    const checks = [
      {
        id: "live-board-sync",
        run() {
          const live = deps.findLiveMatch();
          const boardHidden = deps.liveBoardEl?.classList.contains("hidden");
          const timerHidden = deps.countdownTimerEl?.classList.contains("hidden");

          if (live && boardHidden && !deps.centerMatchPinned) {
            return {
              ok: false,
              detail: "Có trận live nhưng bảng tỷ số đang ẩn",
              fix() {
                deps.clearCenterSelection?.();
                deps.updateCountdown();
              }
            };
          }

          if (!live && !boardHidden && timerHidden) {
            return {
              ok: false,
              detail: "Không còn live nhưng vẫn ở chế độ live board",
              fix() {
                deps.handleLiveMatchTransition?.();
                deps.updateCountdown();
              }
            };
          }

          return { ok: true };
        }
      },
      {
        id: "finished-center",
        run() {
          const center = deps.getCenterMatch?.(deps.nextMatches(Date.now()));
          if (center && deps.isFinishedMatch(center) && !deps.centerMatchPinned) {
            return {
              ok: false,
              detail: "Giữa màn hình đang kẹt ở trận đã kết thúc",
              fix() {
                deps.clearCenterSelection?.();
                deps.handleLiveMatchTransition?.();
                deps.updateCountdown();
              }
            };
          }

          return { ok: true };
        }
      },
      {
        id: "live-score-display",
        run() {
          const live = deps.findLiveMatch();
          if (!live || !deps.liveHomeScoreEl || !deps.liveAwayScoreEl) {
            return { ok: true };
          }

          const expected = deps.getLiveDisplayScores(live);
          const shownHome = Number(deps.liveHomeScoreEl.textContent);
          const shownAway = Number(deps.liveAwayScoreEl.textContent);

          if (shownHome === expected.home && shownAway === expected.away) {
            return { ok: true };
          }

          return {
            ok: false,
            detail: `Tỷ số hiển thị ${shownHome}-${shownAway} khác dữ liệu live ${expected.home}-${expected.away}`,
            fix() {
              deps.updateCountdown();
            }
          };
        }
      },
      {
        id: "stale-local-data",
        run() {
          const status = deps.dataStatusEl?.textContent || "";
          const ageMs = deps.getLiveDataAgeMs?.() ?? 0;

          if (!status.includes("CỤC BỘ") || ageMs < 5 * 60 * 1000) {
            return { ok: true };
          }

          return {
            ok: false,
            detail: "Dữ liệu CỤC BỘ quá cũ, thử fetch ESPN lại",
            fix() {
              deps.forceLiveRefresh?.();
            }
          };
        }
      },
      {
        id: "fetch-loop-stalled",
        run() {
          const stalledMs = deps.getFetchStallMs?.() ?? 0;
          if (stalledMs < 45000) {
            return { ok: true };
          }

          return {
            ok: false,
            detail: `Không fetch ESPN trong ${Math.round(stalledMs / 1000)}s`,
            fix() {
              deps.forceLiveRefresh?.();
            }
          };
        }
      }
    ];

    function run(autoFix) {
      const report = {
        ok: true,
        results: [],
        fixed: 0
      };

      checks.forEach((check) => {
        let result;
        try {
          result = check.run();
        } catch (error) {
          result = {
            ok: false,
            detail: error.message || String(error)
          };
        }

        let fixed = false;
        if (!result.ok && autoFix !== false && typeof result.fix === "function") {
          try {
            result.fix();
            fixed = true;
            report.fixed += 1;
          } catch (error) {
            result.detail = `${result.detail} · fix lỗi: ${error.message || error}`;
          }
        }

        record(check.id, result.ok, result.detail || "", fixed);
        report.results.push({
          id: check.id,
          ok: result.ok,
          detail: result.detail || "",
          fixed
        });

        if (!result.ok) {
          report.ok = false;
        }
      });

      return report;
    }

    function start(intervalMs) {
      const every = Number(intervalMs) > 0 ? Number(intervalMs) : 15000;
      run(true);
      return window.setInterval(() => run(true), every);
    }

    return {
      checks: checks.map((check) => check.id),
      run,
      start,
      getHistory() {
        return history.slice();
      }
    };
  }

  root.WC26SelfHeal = { create: createSelfHeal };
})(typeof globalThis !== "undefined" ? globalThis : this);
