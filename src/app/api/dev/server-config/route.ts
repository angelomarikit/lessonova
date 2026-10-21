import { NextResponse } from "next/server";

import { isDeepInfraConfigured, isDeepInfraTestMode } from "@/lib/deepinfra/config";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    deepInfraConfigured: isDeepInfraConfigured(),
    deepInfraTestMode: isDeepInfraTestMode(),
    serviceRoleConfigured: Boolean(createServiceClient()),
    publicEnvOnly:
      !process.env.DEEPINFRA_API_KEY &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
