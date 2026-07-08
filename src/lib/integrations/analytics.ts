import { getGoogleAccessToken } from "./googleAuth";
import { ApiError } from "@/lib/api";

export interface Ga4DailyRow {
  date: string;
  sessions: number;
  totalUsers: number;
  engagedSessions: number;
}

/** Fetches daily sessions/users from the GA4 Data API. */
export async function fetchGa4DailyStats(
  userId: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4DailyRow[]> {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagedSessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }
  );
  if (!res.ok) {
    throw new ApiError(502, `GA4 API error (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data.rows ?? []).map(
    (r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const raw = r.dimensionValues[0].value; // YYYYMMDD
      return {
        date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
        sessions: Number(r.metricValues[0].value),
        totalUsers: Number(r.metricValues[1].value),
        engagedSessions: Number(r.metricValues[2].value),
      };
    }
  );
}
