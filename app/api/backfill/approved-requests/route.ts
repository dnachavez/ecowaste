import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { ref, get, update } from 'firebase/database';

// Temporary admin-only backfill endpoint.
// Call POST /api/backfill/approved-requests to run.
export async function POST() {
  try {
    const requestsSnap = await get(ref(db, 'requests'));
    const requests = requestsSnap.val() || {};
    const keys = Object.keys(requests);
    let updatedCount = 0;
    const errors: string[] = [];

    for (const k of keys) {
      const req = requests[k];
      if (!req) continue;
      if (req.status !== 'approved') continue;
      if (!req.projectId) continue;
      if (req.materialBackfilled) continue; // already processed

      try {
        const projectSnap = await get(ref(db, `projects/${req.projectId}`));
        const project = projectSnap.val();
        if (!project || !project.materials) {
          errors.push(`project-missing:${req.id}`);
          continue;
        }

        let matched = false;
        const materials = project.materials;
        for (const matId of Object.keys(materials)) {
          const mat = materials[matId] || {};
          const matName = (mat.name || '').toString().toLowerCase();
          const reqTitle = (req.donationTitle || '').toString().toLowerCase();
          if (!matName || !reqTitle) continue;
          if (matName.includes(reqTitle) || reqTitle.includes(matName)) {
            const currentAcquired = Number(mat.acquired) || 0;
            const added = Number(req.quantity) || 0;
            const newAcquired = currentAcquired + added;
            // update material acquired
            await update(ref(db, `projects/${req.projectId}/materials/${matId}`), { acquired: newAcquired });
            matched = true;
            break;
          }
        }

        // mark request as backfilled to avoid double-application
        await update(ref(db, `requests/${k}`), { materialBackfilled: true, materialBackfilledAt: Date.now() });
        if (matched) updatedCount++;
        else errors.push(`no-match:${req.id}`);
      } catch (e: any) {
        errors.push(`${k}: ${e?.message || String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, updated: updatedCount, processed: keys.length, errors });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
