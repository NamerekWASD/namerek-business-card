// ⚠ Temporary, and it goes away at step 3 of the migration.
//
// Step 2's job is the *shape* of the shaft: perspective, the run of the walls,
// the stepped frame, the tone of the surfaces. None of that can be judged in a
// scene with no light in it at all, and the real lighting model — one shaft
// lamp, one landing lamp, every other fitting an emissive mesh — is its own
// piece of work with its own acceptance criteria.
//
// So this is a stand-in, and it is deliberately the dullest possible one: flat
// ambience plus a single weak key from the side the shaft lamps are on, enough
// to tell a wall from a pier and no more. Nothing should be calibrated against
// it, and the "exactly two lights in the scene graph" invariant is written
// against the step-3 rig, not this.
function PreviewLights() {
  return (
    <>
      <ambientLight intensity={1.9} />
      <directionalLight position={[-600, 300, 900]} intensity={1.1} />
    </>
  );
}

export default PreviewLights;
