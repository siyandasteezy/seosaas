import { getGoogleAccessToken } from "./googleAuth";
import { ApiError } from "@/lib/api";

export interface GscDailyRow {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function gscQuery(userId: string, siteUrl: string, body: object) {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new ApiError(502, `Search Console API error (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function fetchGscDailyStats(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GscDailyRow[]> {
  const data = await gscQuery(userId, siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 500,
  });
  return (data.rows ?? []).map(
    (r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      date: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })
  );
}

export async function fetchGscTopQueries(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit = 25
): Promise<GscQueryRow[]> {
  const data = await gscQuery(userId, siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: limit,
  });
  return (data.rows ?? []).map(
    (r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })
  );
}
