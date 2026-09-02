import clsx from "clsx";
import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, Compass, Flame, Gamepad2, Mountain, PartyPopper, Stethoscope, Tent, Trophy } from "lucide-react";
import { Badge, Button, Card, ProgressBar, ScreenHeader } from "../components/ui/primitives";
import { useApp } from "../state/AppContext";
import { useUnitySimulator } from "../hooks/useUnitySimulator";
import type { Mission } from "../types";
import type { ScreenId } from "../App";

const MISSION_ICONS: Record<string, typeof Mountain> = {
  "find-high-ground": Mountain,
  "find-shelter": Tent,
  "find-steep-slope": Flame,
  "find-hospital": Stethoscope,
  "explore-pois": Compass,
};

export function Missions({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { missions, progress, activateMission, region } = useApp();
  const simulator = useUnitySimulator();
  const resultCardRef = useRef<HTMLDivElement | null>(null);

  const startMission = (mission: Mission) => {
    activateMission(mission.id);
    onNavigate("explore");
  };

  const simulatorAvailable = region.status === "full";

  // The simulator's result lands in its own card below (see "Preparedness
  // Simulation Complete" below) rather than in the Level/XP card's
  // preparedness-score stat above — that stat is computed from the web
  // missions only and is intentionally left alone (see progress.preparednessScore
  // and the "IMPORTANT" note in the integration report). Without this, a
  // player returning from the Unity window has no visual cue that anything
  // changed unless they happen to still be scrolled to this exact spot, which
  // reads as "the app didn't notice I finished." Scrolling the result card
  // into view when it appears is the smallest fix for that visibility gap.
  useEffect(() => {
    if (simulator.status === "completed") {
      resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [simulator.status]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader
        eyebrow="Play mode"
        title="Preparedness Missions"
        subtitle="Small challenges that teach the shape of this procedural demo terrain."
      />

      <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-stone-500">
        Missions, your preparedness score, offline readiness, and the Early Warning heuristic all draw on the
        same terrain data — completing the missions below is what fills that picture in.
      </p>

      <Card className="mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-cream-50 shadow-[0_6px_16px_-4px_rgba(46,83,57,0.5)]">
            <Trophy size={24} />
          </div>
          <div>
            <p className="font-display text-lg font-extrabold text-stone-900">Level {progress.level}</p>
            <p className="text-xs text-stone-400 tabular">
              {progress.xp.toLocaleString()} / {progress.xpToNextLevel.toLocaleString()} XP
            </p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <ProgressBar value={progress.xp} max={progress.xpToNextLevel} tone="forest" />
          <p className="mt-1.5 text-right text-[11px] font-bold text-stone-400">
            Preparedness {progress.preparednessScore}%
          </p>
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-cream-50">
              <Gamepad2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-[15px] font-bold text-stone-900">Preparedness Simulator</p>
                <Badge tone="stone">Interactive simulation</Badge>
              </div>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-stone-500">
                Practice {region.name}&rsquo;s missions and a simulated emergency in a full 3D environment, built
                separately in Unity. It opens in its own window and is not real evacuation guidance.
                {!simulatorAvailable && " Full terrain data for this region isn't loaded into the simulator yet — try Aizawl."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!simulatorAvailable}
            onClick={() => simulator.launch(region.id)}
            icon={<Gamepad2 size={14} />}
          >
            Launch Preparedness Simulator
          </Button>
        </div>

        {simulator.status === "launched" && (
          <p className="mt-4 text-[12px] font-semibold text-stone-400">
            Simulator running in a separate window — come back here once you reach the objective.
          </p>
        )}

        {simulator.status === "blocked" && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0 text-amber-600" />
              <div>
                <p className="font-display text-sm font-bold text-stone-900">Simulator window was blocked</p>
                <p className="text-[12px] text-stone-500">
                  Your browser stopped the simulator from opening in a new window. Allow pop-ups for this site,
                  then try again.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => simulator.launch(region.id)}>
              Try Again
            </Button>
          </div>
        )}

        {simulator.status === "completed" && simulator.result && (
          <div
            ref={resultCardRef}
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-forest-600/20 bg-forest-600/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <PartyPopper size={20} className="shrink-0 text-forest-600" />
              <div>
                <p className="font-display text-sm font-bold text-stone-900">Preparedness Simulation Complete</p>
                <p className="text-[12px] text-stone-500">
                  Score {simulator.result.preparednessScore}/100 · {simulator.result.missionsCompleted}/
                  {simulator.result.missionsTotal} missions · +{simulator.result.xpEarned} XP
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={simulator.reset}>
              Dismiss
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {missions.map((mission) => {
          const Icon = MISSION_ICONS[mission.interactionKind ?? ""] ?? Compass;
          const isComplete = mission.status === "complete";
          const isActive = mission.status === "active";
          return (
            <Card
              key={mission.id}
              className={clsx(
                "flex items-center gap-4 p-4 transition-colors sm:p-5",
                isActive && "border-amber-400/60 bg-amber-400/5"
              )}
            >
              <div
                className={clsx(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isComplete ? "bg-forest-100 text-forest-600" : isActive ? "bg-amber-400/15 text-amber-600" : "bg-stone-100 text-stone-400"
                )}
              >
                {isComplete ? <CheckCircle2 size={20} /> : <Icon size={19} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={clsx("font-display text-[15px] font-bold", isComplete ? "text-stone-500 line-through decoration-2" : "text-stone-900")}>
                    {mission.title}
                  </p>
                  {isActive && <Badge tone="amber">In progress</Badge>}
                </div>
                <p className="mt-0.5 text-[13px] text-stone-500">{mission.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-extrabold text-forest-600 tabular">+{mission.xpReward} XP</span>
                {!isComplete && (
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "primary"}
                    onClick={() => startMission(mission)}
                    icon={<ChevronRight size={14} />}
                  >
                    {isActive ? "Resume" : "Start"}
                  </Button>
                )}
                {isComplete && <Circle size={0} className="hidden" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
