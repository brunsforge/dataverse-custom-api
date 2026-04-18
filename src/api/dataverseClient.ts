import axios from "axios";
import type { AxiosInstance } from "axios";
import { getDataverseAccessToken } from "../auth/tokenProvider.js";

export class DataverseClient {
    private readonly environmentUrl: string;

    public constructor(environmentUrl: string) {
        this.environmentUrl = environmentUrl.replace(/\/$/, "");
    }

    public async createHttpClient(): Promise<AxiosInstance> {
        const token = await getDataverseAccessToken(this.environmentUrl);

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