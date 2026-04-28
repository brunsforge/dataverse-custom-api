import { DataverseClient } from "../../api/dataverseClient.js";
import { getCurrentEnvironment } from "../../services/customApiService.js";

interface WhoAmIResponse {
  UserId: string;
  OrganizationId: string;
  BusinessUnitId: string;
}

interface UserPrivilege {
  PrivilegeId: string;
  Depth: number;
  BusinessUnitId: string;
}

interface RetrieveUserPrivilegesResponse {
  RolePrivileges: UserPrivilege[];
}

interface PrivilegeRow {
  privilegeid: string;
  name: string;
}

interface PrivilegeCheck {
  feature: string;
  privilegeName: string;
  privilegeId?: string;
  available: boolean;
}

const KNOWN_PRIVILEGES: Array<{ feature: string; privilegeName: string; privilegeId?: string }> = [
  { feature: "Read Custom API",    privilegeName: "prvReadCustomAPI" },
  { feature: "Create Custom API",  privilegeName: "prvCreateCustomAPI" },
  { feature: "Update Custom API",  privilegeName: "prvWriteCustomAPI" },
  { feature: "Delete Custom API",  privilegeName: "prvDeleteCustomAPI" },
  {
    feature: "PluginType Binding",
    privilegeName: "prvAppendToPluginType",
    privilegeId: "574c053e-6488-4bfb-832a-cbc47aff8b32",
  },
  { feature: "Create Plugin Steps", privilegeName: "prvCreateSdkMessageProcessingStep" },
];

const PRIVILEGE_HINTS: Record<string, string> = {
  prvAppendToPluginType:
    "Custom APIs will be created without a plugin type link.\n" +
    "  Grant 'prvAppendToPluginType' (AppendTo, plugintype, organisation scope) to the app user's security role.",
  prvCreateSdkMessageProcessingStep:
    "Plugin step registrations cannot be created automatically.\n" +
    "  Grant 'prvCreateSdkMessageProcessingStep' (Create, sdkmessageprocessingstep, organisation scope) to the app user's security role.",
  prvReadCustomAPI:
    "Custom APIs cannot be read.\n" +
    "  Grant 'prvReadCustomAPI' (Read, customapi, organisation scope) to the app user's security role.",
  prvCreateCustomAPI:
    "Custom APIs cannot be created.\n" +
    "  Grant 'prvCreateCustomAPI' (Create, customapi, organisation scope) to the app user's security role.",
  prvWriteCustomAPI:
    "Custom APIs cannot be updated.\n" +
    "  Grant 'prvWriteCustomAPI' (Write, customapi, organisation scope) to the app user's security role.",
  prvDeleteCustomAPI:
    "Custom APIs cannot be deleted.\n" +
    "  Grant 'prvDeleteCustomAPI' (Delete, customapi, organisation scope) to the app user's security role.",
};

export async function runValidatePrivilegesCommand(options: {
  verbose?: boolean;
  json?: boolean;
}): Promise<void> {
  const env = await getCurrentEnvironment();
  const client = new DataverseClient(env.environmentUrl);
  const http = await client.createHttpClient();

  const whoAmI = (await http.get<WhoAmIResponse>("/WhoAmI()")).data;
  const userId = whoAmI.UserId;

  const privilegesResponse = await http.get<RetrieveUserPrivilegesResponse>(
    `/systemusers(${userId})/Microsoft.Dynamics.CRM.RetrieveUserPrivileges()`
  );
  const userPrivileges = privilegesResponse.data.RolePrivileges ?? [];
  const userPrivilegeIds = new Set(userPrivileges.map((p) => p.PrivilegeId.toLowerCase()));

  const privilegeNamesToResolve = KNOWN_PRIVILEGES
    .filter((p) => !p.privilegeId)
    .map((p) => p.privilegeName);

  const resolvedIds = new Map<string, string>();
  for (const name of privilegeNamesToResolve) {
    try {
      const res = await http.get<{ value: PrivilegeRow[] }>(
        `/privileges?$select=privilegeid,name&$filter=name eq '${name}'`
      );
      const row = res.data.value[0];
      if (row) {
        resolvedIds.set(name, row.privilegeid);
      }
    } catch {
      // leave unresolved — will show as unavailable
    }
  }

  const checks: PrivilegeCheck[] = KNOWN_PRIVILEGES.map((p) => {
    const id = p.privilegeId ?? resolvedIds.get(p.privilegeName);
    const available = id !== undefined && userPrivilegeIds.has(id.toLowerCase());
    const check: PrivilegeCheck = { feature: p.feature, privilegeName: p.privilegeName, available };
    if (id !== undefined) check.privilegeId = id;
    return check;
  });

  if (options.json) {
    const userInfo = await http.get<{ fullname?: string; systemuserid?: string }>(
      `/systemusers(${userId})?$select=fullname,systemuserid`
    );
    console.log(
      JSON.stringify(
        {
          environmentUrl: env.environmentUrl,
          userId,
          userName: userInfo.data.fullname,
          privileges: checks,
        },
        null,
        2
      )
    );
    return;
  }

  let userName = userId;
  try {
    const userInfo = await http.get<{ fullname?: string }>(
      `/systemusers(${userId})?$select=fullname`
    );
    userName = userInfo.data.fullname ?? userId;
  } catch {
    // use userId as fallback
  }

  const envHost = env.environmentUrl.replace(/^https?:\/\//, "");
  console.log(`\nPrivilege validation for: ${envHost}`);
  console.log(`App user: ${userName} (${userId})\n`);

  const featureCol = 33;
  const privilegeCol = 36;
  const header =
    "FEATURE".padEnd(featureCol) +
    "PRIVILEGE".padEnd(privilegeCol) +
    "STATUS";
  console.log(header);
  console.log("─".repeat(header.length + 6));

  for (const check of checks) {
    const status = check.available ? "✓ Available" : "✗ Missing";
    console.log(
      check.feature.padEnd(featureCol) +
        check.privilegeName.padEnd(privilegeCol) +
        status
    );
  }

  const missing = checks.filter((c) => !c.available);
  if (missing.length > 0) {
    console.log("\nHINTS:");
    for (const m of missing) {
      const hint = PRIVILEGE_HINTS[m.privilegeName];
      if (hint) {
        console.log(`• ${hint}`);
      }
    }
  } else {
    console.log("\nAll checked privileges are available.");
  }

  if (options.verbose) {
    console.log(`\nAll user privileges (${userPrivileges.length} total):`);
    for (const p of userPrivileges) {
      console.log(`  ${p.PrivilegeId}  depth=${p.Depth}`);
    }
  }
}
