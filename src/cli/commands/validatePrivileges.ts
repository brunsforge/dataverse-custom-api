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
  { feature: "Custom API lesen", privilegeName: "prvReadCustomAPI" },
  { feature: "Custom API anlegen", privilegeName: "prvCreateCustomAPI" },
  { feature: "Custom API bearbeiten", privilegeName: "prvWriteCustomAPI" },
  { feature: "Custom API löschen", privilegeName: "prvDeleteCustomAPI" },
  {
    feature: "PluginType-Binding",
    privilegeName: "prvAppendToPluginType",
    privilegeId: "574c053e-6488-4bfb-832a-cbc47aff8b32",
  },
  { feature: "Plugin Steps anlegen", privilegeName: "prvCreateSdkMessageProcessingStep" },
];

const PRIVILEGE_HINTS: Record<string, string> = {
  prvAppendToPluginType:
    "Custom APIs werden ohne Plugin-Verknüpfung erstellt.\n" +
    "  Vergib 'prvAppendToPluginType' (AppendTo, plugintype, Org-Ebene) an die Sicherheitsrolle.",
  prvCreateSdkMessageProcessingStep:
    "Schrittregistrierungen können nicht automatisch angelegt werden.\n" +
    "  Vergib 'prvCreateSdkMessageProcessingStep' (Create, sdkmessageprocessingstep, Org-Ebene).",
  prvReadCustomAPI:
    "Custom APIs können nicht gelesen werden.\n" +
    "  Vergib 'prvReadCustomAPI' (Read, customapi, Org-Ebene) an die Sicherheitsrolle.",
  prvCreateCustomAPI:
    "Custom APIs können nicht angelegt werden.\n" +
    "  Vergib 'prvCreateCustomAPI' (Create, customapi, Org-Ebene) an die Sicherheitsrolle.",
  prvWriteCustomAPI:
    "Custom APIs können nicht bearbeitet werden.\n" +
    "  Vergib 'prvWriteCustomAPI' (Write, customapi, Org-Ebene) an die Sicherheitsrolle.",
  prvDeleteCustomAPI:
    "Custom APIs können nicht gelöscht werden.\n" +
    "  Vergib 'prvDeleteCustomAPI' (Delete, customapi, Org-Ebene) an die Sicherheitsrolle.",
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
  console.log(`\nPrivilege-Validierung für: ${envHost}`);
  console.log(`App-User: ${userName} (${userId})\n`);

  const featureCol = 33;
  const privilegeCol = 36;
  const header =
    "FEATURE".padEnd(featureCol) +
    "PRIVILEGE".padEnd(privilegeCol) +
    "STATUS";
  console.log(header);
  console.log("─".repeat(header.length + 6));

  for (const check of checks) {
    const status = check.available ? "✓ Verfügbar" : "✗ Fehlt";
    console.log(
      check.feature.padEnd(featureCol) +
        check.privilegeName.padEnd(privilegeCol) +
        status
    );
  }

  const missing = checks.filter((c) => !c.available);
  if (missing.length > 0) {
    console.log("\nHINWEISE:");
    for (const m of missing) {
      const hint = PRIVILEGE_HINTS[m.privilegeName];
      if (hint) {
        console.log(`• ${hint}`);
      }
    }
  } else {
    console.log("\nAlle geprüften Privileges sind verfügbar.");
  }

  if (options.verbose) {
    console.log(`\nAlle User-Privileges (${userPrivileges.length} gesamt):`);
    for (const p of userPrivileges) {
      console.log(`  ${p.PrivilegeId}  depth=${p.Depth}`);
    }
  }
}
