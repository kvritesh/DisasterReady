import type { Mission } from "../types";

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: "mission-high-ground",
    title: "Find the High Ground",
    description:
      "Find the highest accessible point in the prepared area — the safest place to head if slopes below become unstable.",
    xpReward: 250,
    status: "available",
    interactive: true,
    interactionKind: "find-high-ground",
  },
  {
    id: "mission-shelter",
    title: "Know Your Shelter",
    description:
      "Locate the nearest emergency shelter — knowing this before an emergency saves critical minutes.",
    xpReward: 150,
    status: "complete",
    interactive: true,
    interactionKind: "find-shelter",
  },
  {
    id: "mission-slope",
    title: "Spot the Steep Slope",
    description:
      "Identify terrain with a slope above 30° — the same steepness threshold this app's Early Warning heuristic treats as elevated risk.",
    xpReward: 200,
    status: "available",
    interactive: true,
    interactionKind: "find-steep-slope",
  },
  {
    id: "mission-hospital",
    title: "Know Your Hospital",
    description: "Locate the nearest hospital — essential to know before any medical emergency during a disaster.",
    xpReward: 150,
    status: "complete",
    interactive: true,
    interactionKind: "find-hospital",
  },
  {
    id: "mission-explore",
    title: "Explore Your Area",
    description: "Visit 5 points of interest to build a working mental map of your prepared area.",
    xpReward: 100,
    status: "complete",
    interactive: true,
    interactionKind: "explore-pois",
  },
];
