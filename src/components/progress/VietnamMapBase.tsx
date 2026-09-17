export type VietnamMapBaseProps = {
  reducedMotion: boolean;
};

export function VietnamMapBase({ reducedMotion }: VietnamMapBaseProps) {
  return (
    <div className="progress-map-base" data-progress-map-base-shell data-reduced-motion={reducedMotion ? 'true' : 'false'} aria-hidden="true">
      <img
        data-progress-map-base
        src="/art/progress/vietnam-progress-map.svg"
        alt=""
        decoding="async"
      />
    </div>
  );
}
