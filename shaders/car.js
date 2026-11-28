if (typeof WGSL !== "undefined") {
  WGSL["mat_car_default"] =
    `// Material PBR estándar universal para carrocerías y piezas de coches
#include mesh_vert
@group(3) @binding(0) var tAtlas: texture_2d<f32>;

fn surf(in: V2F, ff: bool) -> Surface {
  var s = surfDefault(normalize(in.nrm));
  if (!ff) { s.normal = -s.normal; }

  let id = matId(in.mat);
  let p = in.ext.xyz;
  let uv = in.uv;

  let tx = textureSample(tAtlas, sLin, uv);

  if (id == 10u) {
    // Espejo retrovisor físico (interior / laterales): inclinar ligeramente para apuntar al horizonte
    s.normal = normalize(s.normal + vec3f(0.0, -0.13, 0.0));
    s.albedo = vec3f(0.82, 0.85, 0.88);
    s.rough = 0.04;
    s.metal = 0.96;
  } else if (id == 8u || id == 16u || id == 43u) {
    // Carrocería principal, paneles exteriores y vinilos/decoración
    s.albedo = tx.rgb;
    s.metal = 0.08;
    s.rough = 0.18;
    s.coat = 0.90;
    s.ao = smoothstep(0.05, 0.45, p.y) * 0.35 + 0.65;
  } else if (id == 4u) {
    // Neumáticos de competición slick / goma de rodadura
    s.albedo = vec3f(0.05, 0.05, 0.055);
    s.metal = 0.02;
    s.rough = 0.72;
    s.ao = 0.90;
  } else if (id == 2u) {
    // Llantas de competición forjadas
    s.albedo = vec3f(0.18, 0.18, 0.20);
    s.metal = 0.85;
    s.rough = 0.22;
    s.coat = 0.45;
  } else if (id == 0u) {
    // Discos de freno cerámicos perforados / fundición
    s.albedo = vec3f(0.25, 0.25, 0.26);
    s.metal = 0.80;
    s.rough = 0.28;
  } else if (id == 1u) {
    // Pinzas de freno de alto rendimiento
    s.albedo = vec3f(0.85, 0.12, 0.12);
    s.metal = 0.55;
    s.rough = 0.20;
    s.coat = 0.80;
  } else if (id == 9u || id == 25u) {
    // Fibra de carbono expuesta (splitters, difusores, alerones, cockpit)
    s.albedo = vec3f(0.04, 0.04, 0.045);
    s.metal = 0.10;
    s.rough = 0.65;
    s.coat = 0.0;
  } else if (id == 47u) {
    // Ópticas y faros LED frontales (DRL / luces de cruce)
    s.albedo = vec3f(0.95, 0.95, 1.0);
    s.emissive = 0.95;
  } else if (id == 48u) {
    // Pilotos y luces de freno traseras LED
    s.albedo = vec3f(0.95, 0.05, 0.05);
    s.emissive = 0.85;
  } else if (id == 5u || id == 6u) {
    // Salidas de escape de titanio / acero inoxidable
    s.albedo = vec3f(0.85, 0.75, 0.45);
    s.metal = 0.92;
    s.rough = 0.15;
  } else {
    // Piezas mecánicas, motor, transmisión, chasis e interiores
    s.albedo = vec3f(0.06, 0.06, 0.065);
    s.metal = 0.20;
    s.rough = 0.45;
  }

  return s;
}
`;
}
