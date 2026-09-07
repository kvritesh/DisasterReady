#!/usr/bin/env node
// ============================================================================
// Development-only sanity check for the Flood Evacuation scoring engine.
//
// There is no test runner configured in this project (package.json has no
// "test" script / vitest / jest), and installing one wasn't worth the risk
// under time pressure — see the README "Flood Evacuation" section. This is
// the fallback explicitly allowed for that case: a small, dependency-free,
// directly-runnable check.
//
// IMPORTANT: this intentionally mirrors computeElevationScore() from
// src/lib/evacuationScoring.ts as plain JS (Node can't resolve this
// project's extensionless TS imports without a bundler). If you change the
// real formula, update the copy below too — the constants and the function
// body are copy-pasted 1:1 on purpose so a diff between them is obvious.
//
// Run with:  node scripts/scoring-dev-check.mjs
// ============================================================================

// --- mirrors src/lib/evacuationScoring.ts ----------------------------------
const ELEVATION_SCORE_MAX = 30;
const ELEVATION_SCORE_MIN = -30;
const ELEVATION_NEUTRAL_BASELINE = 3;
const ELEVATION_GAIN_CAP_M = 20;
const ELEVATION_LOSS_SLOPE = 1.8;
const GAIN_SLOPE = (ELEVATION_SCORE_MAX - ELEVATION_NEUTRAL_BASELINE) / ELEVATION_GAIN_CAP_M;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeElevationScore(deltaM) {
  if (deltaM >= 0) {
    return clamp(ELEVATION_NEUTRAL_BASELINE + deltaM * GAIN_SLOPE, ELEVATION_NEUTRAL_BASELINE, ELEVATION_SCORE_MAX);
  }
  return clamp(ELEVATION_NEUTRAL_BASELINE + deltaM * ELEVATION_LOSS_SLOPE, ELEVATION_SCORE_MIN, ELEVATION_NEUTRAL_BASELINE);
}

// A trimmed mirror of scoreCandidate()'s other four components, using fixed
// suitability/hazard inputs, just enough to test full-candidate ranking
// scenarios end to end (not just the elevation function in isolation).
function scoreCandidateMirror({ deltaElevationM, distanceM, walkMinutes, suitability }) {
  const elevationScore = computeElevationScore(deltaElevationM);
  const distanceKm = distanceM / 1000;
  const distanceScore = clamp(1 - distanceKm / 5, 0, 1) * 25;
  const accessibilityScore = clamp(1 - walkMinutes / 60, 0, 1) * 20;
  const hazardScore = 5;
  const total = Math.max(0, Math.round(elevationScore + distanceScore + accessibilityScore + suitability + hazardScore));
  return { elevationScore: Math.round(elevationScore * 10) / 10, total };
}

// ----------------------------------------------------------------------------
// Checks
// ----------------------------------------------------------------------------
let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}  -- ${detail}`);
  }
}

console.log("Flood Evacuation scoring — development sanity check\n");

console.log("computeElevationScore() shape:");
check("strong gain caps at +30", computeElevationScore(20) === 30 && computeElevationScore(100) === 30, `got ${computeElevationScore(20)}, ${computeElevationScore(100)}`);
check("equal elevation is a small positive (~3), not 0", computeElevationScore(0) === 3, `got ${computeElevationScore(0)}`);
check("small gain is a modest positive, well under the cap", computeElevationScore(5) > 3 && computeElevationScore(5) < 15, `got ${computeElevationScore(5)}`);
check("small loss (-5m) is already negative", computeElevationScore(-5) < 0, `got ${computeElevationScore(-5)}`);
check("moderate loss (-10m) is a meaningful penalty (<= -10)", computeElevationScore(-10) <= -10, `got ${computeElevationScore(-10)}`);
check("large loss caps at -30", computeElevationScore(-25) === -30 && computeElevationScore(-100) === -30, `got ${computeElevationScore(-25)}, ${computeElevationScore(-100)}`);
check("penalty grows monotonically with more loss", computeElevationScore(-20) < computeElevationScore(-10) && computeElevationScore(-10) < computeElevationScore(-2), "not monotonic");
check("reward grows monotonically with more gain", computeElevationScore(2) < computeElevationScore(10) && computeElevationScore(10) < computeElevationScore(20), "not monotonic");

console.log("\nFull-candidate ranking scenarios (requirement 7):");

// This is the exact bug report: a hospital ~10m LOWER, very close, vs. a
// nearby candidate that is materially higher but a bit further and slower.
{
  const lowerCloseHospital = scoreCandidateMirror({ deltaElevationM: -10, distanceM: 400, walkMinutes: 6, suitability: 15 });
  const higherFartherCandidate = scoreCandidateMirror({ deltaElevationM: 15, distanceM: 900, walkMinutes: 13, suitability: 10 });
  check(
    "reported bug: a close-but-10m-lower hospital no longer beats a farther-but-15m-higher candidate",
    higherFartherCandidate.total > lowerCloseHospital.total,
    `lower/close=${lowerCloseHospital.total} vs higher/farther=${higherFartherCandidate.total}`
  );
}

// Very close but lower vs. farther but SIGNIFICANTLY higher.
{
  const veryCloseLower = scoreCandidateMirror({ deltaElevationM: -8, distanceM: 150, walkMinutes: 2, suitability: 15 });
  const farSignificantlyHigher = scoreCandidateMirror({ deltaElevationM: 35, distanceM: 1400, walkMinutes: 20, suitability: 12 });
  check(
    "far-but-significantly-higher beats very-close-but-lower",
    farSignificantlyHigher.total > veryCloseLower.total,
    `veryCloseLower=${veryCloseLower.total} vs farSignificantlyHigher=${farSignificantlyHigher.total}`
  );
}

// Higher but inaccessible (long walk) should still generally beat a nearby
// LOWER candidate, but accessibility/distance can matter among similar-elevation options.
{
  const higherInaccessible = scoreCandidateMirror({ deltaElevationM: 25, distanceM: 2600, walkMinutes: 45, suitability: 8 });
  const nearbyLower = scoreCandidateMirror({ deltaElevationM: -12, distanceM: 300, walkMinutes: 4, suitability: 15 });
  check(
    "higher-but-hard-to-reach still beats a nearby lower candidate",
    higherInaccessible.total > nearbyLower.total,
    `higherInaccessible=${higherInaccessible.total} vs nearbyLower=${nearbyLower.total}`
  );
}

// Multiple candidates with similar (near-equal) elevation: distance/accessibility should decide.
{
  const similarA = scoreCandidateMirror({ deltaElevationM: 2, distanceM: 300, walkMinutes: 5, suitability: 15 });
  const similarB = scoreCandidateMirror({ deltaElevationM: -1, distanceM: 1800, walkMinutes: 25, suitability: 15 });
  check(
    "among similar elevations, the closer/more accessible one wins",
    similarA.total > similarB.total,
    `closer=${similarA.total} vs farther=${similarB.total}`
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
