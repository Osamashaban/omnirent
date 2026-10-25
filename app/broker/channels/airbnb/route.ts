import { NextResponse, type NextRequest } from "next/server";
import { getCurrentBroker } from "@/lib/broker-auth";
import { airbnbFinish, brokerAppUrl } from "@/lib/channel-data";

// Where Airbnb sends the broker back after approving (or not). The one-time
// token we put in the Airbnb link proves the approval belongs to this
// company; then the broker lands on Channels.
export async function GET(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(`${brokerAppUrl()}/channels?${q}`);
  const current = await getCurrentBroker();
  if (!current) return NextResponse.redirect(`${brokerAppUrl()}/login`);
  const sp = req.nextUrl.searchParams;
  const channelId = sp.get("channel_id") ?? "";
  const token = sp.get("token") ?? sp.get("state") ?? "";
  if (sp.get("success") !== "true" || !channelId || !token) return back("abb=failed");
  const r = await airbnbFinish(current.broker.id, channelId, token).catch(() => "failed" as const);
  if (r === "connected") return back("connected=abb");
  if (r === "reconnected") return back("abb=reconnected");
  return back("abb=failed");
}
