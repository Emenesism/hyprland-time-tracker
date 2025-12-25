const API_BASE = '/api'

/**
 * Fetch wrapper with error handling
 */
async function fetchJSON(url, options = {}) {
    console.log('Fetching:', url, options.method || 'GET', options.body)
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error('API Error:', error)
        throw new Error(error.detail || 'Request failed')
    }

    return response.json()
}

// Tracker API
export const trackerAPI = {
    getStatus: () => fetchJSON(`${API_BASE}/tracker/status`),
    start: (taskId) => fetchJSON(`${API_BASE}/tracker/start?task_id=${taskId}`, { method: 'POST' }),
    stop: () => fetchJSON(`${API_BASE}/tracker/stop`, { method: 'POST' }),
}

// Stats API
export const statsAPI = {
    getSummary: () => fetchJSON(`${API_BASE}/stats/summary`),
    getTimeline: (date) => fetchJSON(`${API_BASE}/timeline?date=${date}`),

    getYearStats: (year) => {
        const query = year ? `?year=${year}` : ''
        return fetchJSON(`${API_BASE}/stats/year${query}`)
    },
}

// Folders API
export const foldersAPI = {
    list: () => fetchJSON(`${API_BASE}/folders`),
    create: (name) => fetchJSON(`${API_BASE}/folders`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    }),
    rename: (id, name) => fetchJSON(`${API_BASE}/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    }),
    delete: (id) => fetchJSON(`${API_BASE}/folders/${id}`, { method: 'DELETE' }),
    exportPDF: (id) => fetch(`${API_BASE}/export/folder/${id}/pdf`),
    exportDetailsPDF: (id) => fetch(`${API_BASE}/export/folder/${id}/details.pdf`),
}

// Tasks API
export const tasksAPI = {
    list: (folderId) => fetchJSON(`${API_BASE}/tasks?folder_id=${folderId}`),
    create: (title, description, folderId) => {
        const url = new URL(`${API_BASE}/tasks`, window.location.origin)
        url.searchParams.append('title', title)
        if (description?.trim()) {
            url.searchParams.append('description', description)
        }
        url.searchParams.append('folder_id', folderId)
        return fetch(url.toString(), { method: 'POST' })
    },
    update: (id, data) => fetchJSON(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    delete: (id) => fetchJSON(`${API_BASE}/tasks/${id}`, { method: 'DELETE' }),
    getStats: (id) => fetchJSON(`${API_BASE}/tasks/${id}/stats`),
    move: (id, folderId) => fetchJSON(`${API_BASE}/tasks/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ folder_id: folderId }),
    }),
}
