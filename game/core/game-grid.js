'use strict';
// Clonado de modelos y pose de rivales en parrilla
function cloneCarModelForGrid(baseModel, instanceIndex) {
  if (!baseModel) return null;
  const isPlayerCar = (typeof CAR !== 'undefined' && baseModel === CAR) ||
    (typeof CARS !== 'undefined' && (baseModel === CARS.active || (CARS.active && baseModel.id === CARS.active.id)));
  if (!isPlayerCar && (!instanceIndex || instanceIndex === 0)) return baseModel;

  const inst = Object.create(baseModel);
  inst.id = `${baseModel.id}_inst${instanceIndex}`;
  if (typeof objSlot === 'function') {
    inst.slotBody = objSlot();
    inst.slotWheel = [objSlot(), objSlot(), objSlot(), objSlot()];
  }
  inst.inp = new Float64Array(2);
  inst._t2 = m4();
  inst.built = true;

  if (baseModel.set && baseModel.set.items) {
    const items = baseModel.set.items;
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const it = items[i];
      if (it.slot === baseModel.slotBody) {
        items.push({
          vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotBody,
          flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
          maxDist: it.maxDist, wc: new Float32Array(3), on: true
        });
      } else if (baseModel.slotWheel) {
        for (let w = 0; w < 4; w++) {
          if (it.slot === baseModel.slotWheel[w]) {
            items.push({
              vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotWheel[w],
              flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
              maxDist: it.maxDist, wc: new Float32Array(3), on: true
            });
            break;
          }
        }
      }
    }
  }

  if (baseModel.glass && baseModel.glass.items) {
    const items = baseModel.glass.items;
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const it = items[i];
      if (it.slot === baseModel.slotBody) {
        items.push({
          vb: it.vb, ib: it.ib, count: it.count, slot: inst.slotBody,
          flags: it.flags, cx: it.cx, cy: it.cy, cz: it.cz, r: it.r,
          maxDist: it.maxDist, wc: new Float32Array(3), on: true
        });
      }
    }
  }

  inst.place = function (body, spin, susp) {
    const steer = inst.inp[0];
    const t = inst._t2;
    if (typeof objPrev === 'function' && typeof objModel === 'function') {
      objPrev(inst.slotBody).set(objModel(inst.slotBody));
      objModel(inst.slotBody).set(body);
      for (let i = 0; i < 4; i++) {
        const sl = inst.slotWheel[i], h = inst.hubs[i], left = (i & 1) === 0;
        objPrev(sl).set(objModel(sl));
        const a = -(i < 2 ? steer : 0) + (left ? Math.PI : 0), c = Math.cos(a), sn = Math.sin(a);
        const g = left ? spin[i] : -spin[i], cg = Math.cos(g), sg = Math.sin(g);
        t[0] = c * cg; t[1] = sg; t[2] = -sn * cg; t[3] = 0;
        t[4] = -c * sg; t[5] = cg; t[6] = sn * sg; t[7] = 0;
        t[8] = sn; t[9] = 0; t[10] = c; t[11] = 0;
        t[12] = h[0]; t[13] = h[1] + susp[i]; t[14] = h[2]; t[15] = 1;
        m4mul(objModel(sl), body, t);
      }
    }
  };

  return inst;
}

function poseRival(CR, VR, gsR, kr, al) {
  if (!CR || !VR || !gsR) return;
  if (!CR.built && typeof CR.build === 'function') {
    CR.build();
    CR.built = true;
  }
  if (!CR.slotBody && CR.slotBody !== 0) return;
  const PR = (CR.physics && CR.physics.VP) || VP;
  const xr = VR.px + (VR.x - VR.px) * al, zr = VR.pz + (VR.z - VR.pz) * al, yr = VR.py + (VR.y - VR.py) * al;
  let dyr = VR.yaw - VR.pyaw; if (dyr > PI) dyr -= TAU; else if (dyr < -PI) dyr += TAU; const yawr = VR.pyaw + dyr * al;
  const gpr = VR.pgPitch + (VR.gPitch - VR.pgPitch) * al, grr = VR.pgRoll + (VR.gRoll - VR.pgRoll) * al, rollr = VR.proll + (VR.roll - VR.proll) * al, pitchr = VR.ppitch + (VR.pitch - VR.ppitch) * al, heaver = VR.pheave + (VR.heave - VR.pheave) * al;
  const cr = Math.cos(yawr), sr = Math.sin(yawr), oxr = -(PR.L / 2 - PR.a);
  gsR.cx = xr + cr * oxr; gsR.cz = zr + sr * oxr; gsR.cy = yr; gsR.yaw = yawr; gsR.steer = VR.psteer + (VR.steer - VR.psteer) * al; gsR.speed = Math.sqrt(VR.vx * VR.vx + VR.vy * VR.vy);
  const BR = gsR.body, TR = gsR.tmp, GR0 = gsR.ground;
  GR0[0] = cr; GR0[1] = 0; GR0[2] = sr; GR0[3] = 0; GR0[4] = 0; GR0[5] = 1; GR0[6] = 0; GR0[7] = 0; GR0[8] = -sr; GR0[9] = 0; GR0[10] = cr; GR0[11] = 0; GR0[12] = gsR.cx; GR0[13] = gsR.cy; GR0[14] = gsR.cz; GR0[15] = 1;
  ROTQ[0] = gpr; rotZQ(TR); m4mul(GR0, GR0, TR); ROTQ[0] = -grr; rotXQ(TR); m4mul(GR0, GR0, TR);
  BR[0] = GR0[0]; BR[1] = GR0[1]; BR[2] = GR0[2]; BR[3] = 0; BR[4] = GR0[4]; BR[5] = GR0[5]; BR[6] = GR0[6]; BR[7] = 0; BR[8] = GR0[8]; BR[9] = GR0[9]; BR[10] = GR0[10]; BR[11] = 0; BR[12] = GR0[12]; BR[13] = GR0[13]; BR[14] = GR0[14]; BR[15] = 1;
  m4ident(TR); TR[13] = 0.18 + heaver; m4mul(BR, GR0, TR);
  ROTQ[0] = -pitchr; rotZQ(TR); m4mul(BR, BR, TR); ROTQ[0] = -rollr; rotXQ(TR); m4mul(BR, BR, TR);
  m4ident(TR); TR[13] = -0.18; m4mul(BR, BR, TR);
  if (CR.hubs) {
    const wheelR = CR.wheelR || PR.R;
    for (let i = 0; i < 4; i++) {
      const h = CR.hubs[i], hy = BR[1] * h[0] + BR[5] * h[1] + BR[9] * h[2] + BR[13];
      let su = VR.wy[i] + wheelR - hy; su = su < -0.09 ? -0.09 : su > 0.09 ? 0.09 : su;
      gsR.susp[i] = su; gsR.spin[i] = VR.pspin[i] + (VR.spin[i] - VR.pspin[i]) * al;
    }
  }
  if (!CR.inp) CR.inp = new Float64Array(2);
  CR.inp[0] = gsR.steer; CR.inp[1] = gsR.steer * 14;
  if (typeof CR.place === 'function') {
    CR.place(BR, gsR.spin, gsR.susp);
  }
  if (CR.slotBody !== undefined && typeof objParams === 'function') {
    const bpR = objParams(CR.slotBody);
    if (bpR) {
      bpR[0] = ((kr & K_S) && VR.gear !== 0) || ((kr & K_W) && VR.gear === 0) ? 1 : 0; bpR[1] = VR.gear === 0 ? 1 : 0; bpR[2] = 1;
    }
  }
  if (CR.slotWheel && typeof objParams === 'function') {
    for (let i = 0; i < 4; i++) {
      const w = VR.omega[i];
      const wp = objParams(CR.slotWheel[i]);
      if (wp) wp[0] = w < 0 ? -w : w;
    }
  }
}

