import type { Task, TaskInsert, TaskUpdate } from "./supabase"

// Mock data storage - start with empty array
let mockTasks: Task[] = []

// Simulate async operations
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockSupabaseOperations = {
  async fetchTasks(): Promise<{ data: Task[] | null; error: any }> {
    await delay(500) // Simulate network delay
    return {
      data: [...mockTasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      error: null,
    }
  },

  async insertTask(task: TaskInsert): Promise<{ data: Task | null; error: any }> {
    await delay(300)
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockTasks.push(newTask)
    return { data: newTask, error: null }
  },

  async updateTask(id: string, updates: TaskUpdate): Promise<{ data: Task | null; error: any }> {
    await delay(200)
    const taskIndex = mockTasks.findIndex((task) => task.id === id)
    if (taskIndex === -1) {
      return { data: null, error: { message: "Task not found" } }
    }

    mockTasks[taskIndex] = {
      ...mockTasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    return { data: mockTasks[taskIndex], error: null }
  },

  async deleteTask(id: string): Promise<{ error: any }> {
    await delay(200)
    mockTasks = mockTasks.filter((task) => task.id !== id)
    return { error: null }
  },
}

// Event emitter for simulating real-time updates
type EventCallback = (payload: { eventType: string; new?: Task; old?: Task }) => void
const eventCallbacks: EventCallback[] = []

export const mockRealtimeSubscription = {
  subscribe: (callback: EventCallback) => {
    eventCallbacks.push(callback)
    return {
      unsubscribe: () => {
        const index = eventCallbacks.indexOf(callback)
        if (index > -1) {
          eventCallbacks.splice(index, 1)
        }
      },
    }
  },

  emit: (eventType: string, data: any) => {
    eventCallbacks.forEach((callback) => {
      callback({ eventType, ...data })
    })
  },
}
