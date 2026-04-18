import axios from "axios";
import type { AxiosInstance } from "axios";
import type { RuntimeContext } from "../models/runtime-context.js";
import { getDataverseAccessToken } from "../auth/tokenProvider.js";

export class DataverseClient {
  private readonly environmentUrl: string;

  public constructor(
    environmentUrl: string,
    private readonly context?: RuntimeContext
  ) {
    this.environmentUrl = environmentUrl.replace(/\/$/, "");
  }

  public async createHttpClient(): Promise<AxiosInstance> {
    const token = await getDataverseAccessToken(this.environmentUrl, this.context);

    return axios.create({
      baseURL: `${this.environmentUrl}/api/data/v9.2`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
      },
    });
  }

  public async whoAmI(): Promise<unknown> {
    const http = await this.createHttpClient();
    const response = await http.get("/WhoAmI()");
    return response.data;
  }
}
