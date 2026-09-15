export function WorldScene() {
  return (
    <div className="world-scene" aria-hidden="true">
      <picture className="world-background-source">
        <source media="(orientation: portrait)" srcSet="/art/world-background-portrait.png" />
        <img className="world-background-image" src="/art/world-background.png" alt="" />
      </picture>
      <div className="scene-vignette" />
    </div>
  );
}
