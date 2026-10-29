import { API_BASE_URL } from "./constants";

const getBaseUrl = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE_URL;
    if (!backendUrl) return "/api";
    return backendUrl.endsWith("/api") ? backendUrl : `${backendUrl}/api`;
};

const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    } else if (typeof window !== "undefined") {
        console.warn("API Client: [WARNING] No token found in localStorage. Request will likely fail with 401.");
    }

    return headers;
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        if (response.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    return response.json();
};

const api = {
    // ... paths remain same for Laravel (default)
    get: async (url: string, params?: Record<string, any>) => {
        let finalUrl = `${getBaseUrl()}${url}`;
        
        let queryParams = params;
        if (params && 'params' in params && typeof params.params === 'object' && params.params !== null) {
            queryParams = params.params;
        }

        // Append query params if any
        if (queryParams) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, value.toString());
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                finalUrl += (finalUrl.includes("?") ? "&" : "?") + queryString;
            }
        }

        // Auto-append user_id if not present (legacy support for some backend logic)
        if (!finalUrl.includes("user_id=")) {
            const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user && user.id) {
                        finalUrl += (finalUrl.includes("?") ? "&" : "?") + `user_id=${user.id}`;
                    }
                } catch {}
            }
        }

        const response = await fetch(finalUrl, {
            method: "GET",
            headers: getHeaders(),
        });

        return { data: await handleResponse(response) };
    },

    post: async (url: string, data: any = {}) => {
        const response = await fetch(`${getBaseUrl()}${url}`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return { data: await handleResponse(response) };
    },

    put: async (url: string, data: any = {}) => {
        const response = await fetch(`${getBaseUrl()}${url}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return { data: await handleResponse(response) };
    },

    patch: async (url: string, data: any = {}) => {
        const response = await fetch(`${getBaseUrl()}${url}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return { data: await handleResponse(response) };
    },

    delete: async (url: string) => {
        const response = await fetch(`${getBaseUrl()}${url}`, {
            method: "DELETE",
            headers: getHeaders(),
        });
        return { data: await handleResponse(response) };
    },

    // Express backend support (Port 5656)
    express: {
        get: async (url: string, params?: Record<string, any>) => {
            const expressBase = getBaseUrl();
            let finalUrl = `${expressBase}${url}`;
            
            let queryParams = params;
            if (params && 'params' in params && typeof params.params === 'object' && params.params !== null) {
                queryParams = params.params;
            }

            if (queryParams) {
                const searchParams = new URLSearchParams();
                Object.entries(queryParams).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.append(key, value.toString());
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    finalUrl += (finalUrl.includes("?") ? "&" : "?") + queryString;
                }
            }

            const response = await fetch(finalUrl, {
                method: "GET",
                headers: getHeaders(),
            });

            return { data: await handleResponse(response) };
        },

        post: async (url: string, data: any = {}) => {
            const expressBase = getBaseUrl();
            const response = await fetch(`${expressBase}${url}`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return { data: await handleResponse(response) };
        },

        put: async (url: string, data: any = {}) => {
            const expressBase = getBaseUrl();
            const response = await fetch(`${expressBase}${url}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return { data: await handleResponse(response) };
        },

        patch: async (url: string, data: any = {}) => {
            const expressBase = getBaseUrl();
            const response = await fetch(`${expressBase}${url}`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            return { data: await handleResponse(response) };
        },

        delete: async (url: string) => {
            const expressBase = getBaseUrl();
            const response = await fetch(`${expressBase}${url}`, {
                method: "DELETE",
                headers: getHeaders(),
            });
            return { data: await handleResponse(response) };
        }
    }
};

export default api;
