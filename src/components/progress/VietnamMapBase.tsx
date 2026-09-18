export type VietnamMapBaseProps = {
  reducedMotion: boolean;
};

export function VietnamMapBase({ reducedMotion }: VietnamMapBaseProps) {
  return (
    <div className="progress-map-base" data-progress-map-base-shell data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <img
        data-progress-map-base
        src="/art/progress/vietnam-progress-map-illustrated.png"
        alt="Bản đồ minh họa Việt Nam có Hoàng Sa và Trường Sa."
        decoding="async"
      />
    </div>
  );
}
