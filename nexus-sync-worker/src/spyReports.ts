// ============================================================================
// NEXUS OVERWATCH — SHARED ESPIONAGE REPORT REPOSITORY
// ============================================================================

import { json } from 'itty-router';
import { z } from 'zod';
import { Env } from './index';
import { authenticateMember } from './galaxySync';

// Zod Schema for sharing a Spy Report
export const ShareSpyReportSchema = z.object({
  reportId: z.string().min(1).max(50),
  coords: z.string().regex(/^\d{1,2}:\d{1,3}:\d{1,2}$/), // e.g. "1:234:5"
  isMoon: z.number().int().min(0).max(1).default(0),
  targetPlayerId: z.string().nullable().optional(),
  targetPlayerName: z.string().nullable().optional(),
  resourcesMetal: z.number().default(0),
  resourcesCrystal: z.number().default(0),
  resourcesDeuterium: z.number().default(0),
  estimatedLoot: z.number().default(0),
  fleetData: z.any().optional(), // Structured ships array / object
  defenseData: z.any().optional(), // Structured defenses array / object
  buildingsData: z.any().optional(), // Structured buildings array / object
  techData: z.any().optional(), // Structured techs array / object
  spiedBy: z.string().min(1).max(50).optional(),
  reportTimestamp: z.number(), // In-game report timestamp in ms
});

export type ShareSpyReportPayload = z.infer<typeof ShareSpyReportSchema>;

/**
 * Handles POST /api/v1/spy/share
 * Allows any alliance member to share a spy report with their alliance.
 */
export async function handleShareSpyReport(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized: Invalid or missing token.' }, { status: 401 });
    }
    if ('error' in member && member.error === 'subscription_expired') {
      return json({ error: 'Alliance subscription has expired.' }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = ShareSpyReportSchema.safeParse(body);
    if (!parseResult.success) {
      return json({ error: 'Invalid spy report payload', details: parseResult.error.format() }, { status: 400 });
    }

    const report = parseResult.data;
    const now = Date.now();
    const spiedByName = report.spiedBy || member.player_name || 'Alliance Scout';

    // Calculate default estimated loot if not provided (50% standard plunder)
    let loot = report.estimatedLoot;
    if (!loot && (report.resourcesMetal || report.resourcesCrystal || report.resourcesDeuterium)) {
      loot = Math.floor((report.resourcesMetal + report.resourcesCrystal + report.resourcesDeuterium) * 0.5);
    }

    // Check if an existing report for this coordinate already exists in this alliance
    const existing: any = await env.DB.prepare(
      `SELECT report_id, report_timestamp FROM spy_reports
       WHERE alliance_id = ? AND universe_id = ? AND coords = ? AND is_moon = ?`
    )
      .bind(member.alliance_id, member.universe_id, report.coords, report.isMoon)
      .first();

    // If existing report is newer than the incoming one, keep the newer one
    if (existing && existing.report_timestamp > report.reportTimestamp) {
      return json({
        success: true,
        reportId: existing.report_id,
        isNewer: false,
        message: 'A newer spy report for these coordinates is already shared with your alliance.',
      });
    }

    // Insert or update the shared spy report
    await env.DB.prepare(
      `INSERT INTO spy_reports (
        report_id, alliance_id, universe_id, coords, is_moon,
        target_player_id, target_player_name, resources_metal, resources_crystal,
        resources_deuterium, estimated_loot, fleet_data_json, defense_data_json,
        buildings_data_json, tech_data_json, spied_by, report_timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(report_id) DO UPDATE SET
        resources_metal = excluded.resources_metal,
        resources_crystal = excluded.resources_crystal,
        resources_deuterium = excluded.resources_deuterium,
        estimated_loot = excluded.estimated_loot,
        fleet_data_json = excluded.fleet_data_json,
        defense_data_json = excluded.defense_data_json,
        buildings_data_json = excluded.buildings_data_json,
        tech_data_json = excluded.tech_data_json,
        spied_by = excluded.spied_by,
        report_timestamp = excluded.report_timestamp`
    )
      .bind(
        report.reportId,
        member.alliance_id,
        member.universe_id,
        report.coords,
        report.isMoon,
        report.targetPlayerId || null,
        report.targetPlayerName || null,
        report.resourcesMetal,
        report.resourcesCrystal,
        report.resourcesDeuterium,
        loot,
        report.fleetData ? JSON.stringify(report.fleetData) : null,
        report.defenseData ? JSON.stringify(report.defenseData) : null,
        report.buildingsData ? JSON.stringify(report.buildingsData) : null,
        report.techData ? JSON.stringify(report.techData) : null,
        spiedByName,
        report.reportTimestamp,
        now
      )
      .run();

    return json({
      success: true,
      reportId: report.reportId,
      coords: report.coords,
      isMoon: report.isMoon === 1,
      spiedBy: spiedByName,
      estimatedLoot: loot,
      message: `Spy report for [${report.coords}] shared with ${member.alliance_name}!`,
    });
  } catch (err: any) {
    console.error('Error in handleShareSpyReport:', err);
    return json({ error: 'Failed to share spy report', details: err.message }, { status: 500 });
  }
}

/**
 * Handles GET /api/v1/spy/reports
 * Fetches shared spy reports for the caller's alliance.
 */
export async function handleGetSpyReports(req: Request, env: Env) {
  try {
    const member = await authenticateMember(req, env);
    if (!member) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const coords = url.searchParams.get('coords');
    const targetPlayerName = url.searchParams.get('targetPlayerName');
    const minLoot = parseInt(url.searchParams.get('minLoot') || '0', 10);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));

    let query = `
      SELECT report_id, coords, is_moon, target_player_id, target_player_name,
             resources_metal, resources_crystal, resources_deuterium, estimated_loot,
             fleet_data_json, defense_data_json, buildings_data_json, tech_data_json,
             spied_by, report_timestamp, created_at
      FROM spy_reports
      WHERE alliance_id = ? AND universe_id = ?
    `;
    const params: any[] = [member.alliance_id, member.universe_id];

    if (coords) {
      query += ` AND coords = ?`;
      params.push(coords);
    }
    if (targetPlayerName) {
      query += ` AND target_player_name LIKE ?`;
      params.push(`%${targetPlayerName}%`);
    }
    if (minLoot > 0) {
      query += ` AND estimated_loot >= ?`;
      params.push(minLoot);
    }

    query += ` ORDER BY report_timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await env.DB.prepare(query).bind(...params).all();

    // Parse JSON fields
    const parsedReports = (rows?.results || []).map((r: any) => ({
      ...r,
      fleetData: r.fleet_data_json ? JSON.parse(r.fleet_data_json) : null,
      defenseData: r.defense_data_json ? JSON.parse(r.defense_data_json) : null,
      buildingsData: r.buildings_data_json ? JSON.parse(r.buildings_data_json) : null,
      techData: r.tech_data_json ? JSON.parse(r.tech_data_json) : null,
    }));

    return json({
      success: true,
      allianceTag: member.alliance_tag,
      totalReturned: parsedReports.length,
      reports: parsedReports,
    });
  } catch (err: any) {
    console.error('Error in handleGetSpyReports:', err);
    return json({ error: 'Failed to fetch spy reports', details: err.message }, { status: 500 });
  }
}
