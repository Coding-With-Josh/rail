import Map from "@/components/map";

export default function MapPage() {
  return (
    <div className="flex flex-col w-full h-full gap-3 p-4 sm:p-6">
      <div className="shrink-0">
        <p className="text-black/80 dark:text-white/90 text-2xl font-medium tracking-tight">Live Map</p>
        <p className="text-black/50 dark:text-white/50 text-sm">Track location and events across all devices.</p>
      </div>
      <div className="flex-1 min-h-0">
        <Map />
      </div>
    </div>
  );
}
