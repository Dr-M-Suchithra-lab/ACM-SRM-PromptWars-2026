import {
  Biohazard,
  Footprints,
  CircleHelp,
  Construction,
  DoorOpen,
  Flame,
  FlaskConical,
  Hand,
  HardHat,
  Cog,
  PersonStanding,
  Shield,
  Sun,
  Syringe,
  Volume2,
  Weight,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  fire: Flame,
  fall_from_height: PersonStanding,
  scaffolding: Construction,
  electrical: Zap,
  heat_stress: Sun,
  ppe_missing: HardHat,
  machinery: Cog,
  needle_stick: Syringe,
  chemical_biohazard: Biohazard,
  patient_aggression: Hand,
  slip: Footprints,
  lifting_injury: Weight,
  chemical_labs: FlaskConical,
  machinery_guard: Shield,
  noise: Volume2,
  chemical: FlaskConical,
  fire_exit: DoorOpen,
};

export function HazardIcon({ category, className = "size-8" }: { category: string; className?: string }) {
  const Icon = ICONS[category] ?? CircleHelp;
  return <Icon aria-hidden="true" className={className} />;
}
