export interface ApiClient {
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
  put: <T>(url: string, data: any) => Promise<T>
  delete: <T>(url: string) => Promise<T>
}

export const createApiClient = (baseURL: string): ApiClient => {
  const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${baseURL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  return {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, data: any) => request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    put: <T>(url: string, data: any) => request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: <T>(url: string) => request<T>(url, {
      method: 'DELETE',
    }),
  }
}
