export const cssVariables = {
  '--bg': '#1a120e',
  '--bg-2': '#2a1a10',
  '--panel': '#2c2015',
  '--screen': '#100f0a',
  '--ink': '#ECE1C8',
  '--muted': '#a3906d',
  '--line': '#5c4530',
  '--brass': '#c2903f',
  '--brass-deep': '#8b5e22',
  '--glow': '#ffb454',
  '--rivet': '#4a3623',
  // Enamel. The one family of colour in here that is painted rather than
  // corroded. Interwar industry marked itself with vitreous enamel — steel
  // dipped in coloured glass and fired — which is why the surviving plates are
  // still saturated while everything bolted next to them has gone to rust, and
  // it is the reason a 1930s stairwell is not brown the whole way through.
  // Two fields and one cream, so they read as one signage system.
  '--enamel-red': '#8c2f26',
  '--enamel-green': '#1e4034',
  '--enamel-cream': '#e9dfc6',
  // The display face. It was Bitter, a slab serif, which belongs to
  // nineteenth-century printing rather than to this building — the era this
  // scene is set in signed itself in heavy grotesques and geometric sans.
  '--display': "'Archivo Black', 'Space Grotesk', sans-serif",
  // The shared stylesheet aims h1–h3 at --serif. There is no serif in this
  // variant, so it aims at the same face rather than falling through to the
  // Renaissance one the others use.
  '--serif': "'Archivo Black', 'Space Grotesk', sans-serif",
  '--mono': "'Space Mono', monospace",
};

// The enamel fields as raw hex, because everything inside the shaft has to be
// multiplied by the light reaching it and `rgb()` needs the components. The CSS
// custom properties above are the same colours for the flat UI, which is lit by
// nothing and can take them straight.
export const ENAMEL = { red: '#8c2f26', green: '#1e4034', cream: '#e9dfc6' };
