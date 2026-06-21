import axios from "axios";

import { CONFIG } from "@/react-app/lib/config";

export const terminalClient = axios.create({
    baseURL: CONFIG.TERMINAL_API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

