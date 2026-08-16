import { CAM_ORIGIN_Y, CAM_PERSPECTIVE } from '../../model/camera.js';

// The shared camera, as a container rather than three copies of the same two
// divs. Every part of the scene that needs its own `preserve-3d` root — the
// shaft, the doorways, the cage front — opens one of these; all three used to
// carry this exact pair of styles independently; the camera constants moving
// out of sync between them was one wrong number away from happening.
function Stage({ children }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        perspective: `${CAM_PERSPECTIVE}px`,
        perspectiveOrigin: `50% ${CAM_ORIGIN_Y * 100}%`,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
}

export default Stage;
