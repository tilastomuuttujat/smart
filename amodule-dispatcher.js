/* ============================================================
   module-dispatcher.js – ÄLYKÄS MODUULIEN JAKAJA (KORJATTU)
   Vastuu:
   - Valitsee moduulit lukukontekstin perusteella
   - Roolipohjainen priorisointi
   - Maksimimäärät per rooli
   - blind_spot: primary → secondary -ketju
   - EI tunne näkymiä
   - VÄLITTÄÄ containerin renderille
============================================================ */

(function () {

  const ROLE_LIMITS = {
    atmosphere: 1,
    analysis: 1,
    blind_spot: 1, // primary blind_spot
    reflection: 1,
    orientation: 1
  };

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function eligible(mod, ctx) {
    if (typeof mod.isAvailable === "function") {
      return mod.isAvailable(ctx);
    }
    if (typeof mod.when === "function") {
      return mod.when(ctx);
    }
    return true;
  }

  function score(mod, ctx) {
    const base = mod.priority ?? 0.5;
    const weight =
      typeof mod.weight === "function"
        ? clamp01(mod.weight(ctx))
        : 1;

    return base * weight;
  }

  function selectPrimary(mods, ctx, limit = 1) {
    return mods
      .map(m => ({ m, s: score(m, ctx) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.m);
  }

  function resolve(ctx, container) {
    if (!window.ModuleRegistry) return;
    if (!container) {
      console.warn("ModuleDispatcher: container puuttuu");
      return;
    }

    const all = ModuleRegistry.list();

    // 🔒 active_modules-suodatus
    const filtered = ctx.active_modules
      ? all.filter(m => ctx.active_modules.includes(m.id))
      : all;

    const usable = filtered.filter(m => eligible(m, ctx));

    const byRole = {};
    usable.forEach(mod => {
      const role = mod.role || "analysis";
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(mod);
    });

    const finalSelection = [];

    /* ===========================
       NORMAALIT ROOLIT
    ============================ */

    Object.entries(byRole).forEach(([role, mods]) => {
      if (role === "blind_spot") return; // käsitellään erikseen

      const limit = ROLE_LIMITS[role] ?? 1;
      const chosen = selectPrimary(mods, ctx, limit);
      finalSelection.push(...chosen);
    });

/* ===========================
   BLIND_SPOT – KETJU + FALLBACK
=========================== */

const blindSpots = byRole["blind_spot"] || [];

if (blindSpots.length) {
  const primaryCandidates = blindSpots.filter(
    m => m.blind_spot_level !== "secondary"
  );

  let primary = selectPrimary(primaryCandidates, ctx, 1)[0];

  // 🔑 FALLBACK: jos primary puuttuu, valitse paras blind_spot
  if (!primary) {
    primary = selectPrimary(blindSpots, ctx, 1)[0];
  }

  if (primary) {
    finalSelection.push(primary);

    const secondaryCandidates = blindSpots.filter(
      m =>
        m.blind_spot_level === "secondary" &&
        (
          !m.after ||
          (Array.isArray(m.after) && m.after.includes(primary.id))
        )
    );

    const secondary = selectPrimary(secondaryCandidates, ctx, 1)[0];
    if (secondary) {
      finalSelection.push(secondary);
    }
  }
}

    /* ===========================
       RENDERÖINTI
    ============================ */

    finalSelection.forEach(mod => {
      try {
        mod.render?.(container, ctx);
      } catch (e) {
        console.error("ModuleDispatcher: render epäonnistui", mod.id, e);
      }
    });
  }

  window.ModuleDispatcher = { resolve };

})();
