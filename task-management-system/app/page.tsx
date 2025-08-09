"use client"

import { useState, useEffect } from "react"
import { supabase, isSupabaseConfigured, type Task, type TaskInsert } from "@/lib/supabase"
import { mockSupabaseOperations, mockRealtimeSubscription } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarDays, Clock, CheckCircle, AlertCircle, Plus, Search, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
}

const statusColors = {
  NOT_STARTED: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
}

const priorityLabels = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Khẩn cấp",
}

const statusLabels = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  DONE: "Hoàn thành",
  OVERDUE: "Quá hạn",
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [supabaseWorking, setSupabaseWorking] = useState(false)
  const { toast } = useToast()

  const [newTask, setNewTask] = useState<TaskInsert>({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "NOT_STARTED",
    assignee: "",
    deadline: "",
  })

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    if (!isSupabaseConfigured) {
      setSupabaseWorking(false)
      return false
    }

    try {
      const { error } = await supabase.from("tasks").select("count", { count: "exact", head: true })
      const working = !error
      setSupabaseWorking(working)
      return working
    } catch (error) {
      console.error("Supabase connection test failed:", error)
      setSupabaseWorking(false)
      return false
    }
  }

  // Fetch tasks with improved error handling
  const fetchTasks = async () => {
    try {
      setLoading(true)
      let data: Task[] = []

      // Test Supabase connection first
      const connectionWorking = await testSupabaseConnection()

      if (connectionWorking) {
        try {
          const { data: supabaseData, error } = await supabase
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: true })

          if (error) {
            console.error("Supabase query error:", error)
            throw error
          }
          data = supabaseData || []
        } catch (supabaseError) {
          console.error("Supabase fetch failed, using mock data:", supabaseError)
          setSupabaseWorking(false)
          const { data: mockData } = await mockSupabaseOperations.fetchTasks()
          data = mockData || []
        }
      } else {
        // Use mock data
        const { data: mockData } = await mockSupabaseOperations.fetchTasks()
        data = mockData || []
      }

      setTasks(data)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setTasks([])
      toast({
        title: "Thông báo",
        description: "Đang sử dụng chế độ demo. Dữ liệu sẽ không được lưu trữ.",
        variant: "default",
      })
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchTasks()

    let subscription: any

    if (supabaseWorking) {
      const channel = supabase
        .channel("tasks-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
          },
          (payload) => {
            console.log("Realtime update:", payload)
            if (payload.eventType === "INSERT") {
              setTasks((prev) => [...prev, payload.new as Task])
            } else if (payload.eventType === "UPDATE") {
              setTasks((prev) => prev.map((task) => (task.id === payload.new.id ? (payload.new as Task) : task)))
            } else if (payload.eventType === "DELETE") {
              setTasks((prev) => prev.filter((task) => task.id !== payload.old.id))
            }
          },
        )
        .subscribe()

      subscription = { unsubscribe: () => supabase.removeChannel(channel) }
    } else {
      // Use mock real-time subscription
      subscription = mockRealtimeSubscription.subscribe((payload) => {
        console.log("Mock realtime update:", payload)
        if (payload.eventType === "INSERT" && payload.new) {
          setTasks((prev) => [...prev, payload.new!])
        } else if (payload.eventType === "UPDATE" && payload.new) {
          setTasks((prev) => prev.map((task) => (task.id === payload.new!.id ? payload.new! : task)))
        } else if (payload.eventType === "DELETE" && payload.old) {
          setTasks((prev) => prev.filter((task) => task.id !== payload.old!.id))
        }
      })
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabaseWorking])

  // Filter tasks
  useEffect(() => {
    let filtered = tasks

    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.assignee?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    setFilteredTasks(filtered)
  }, [tasks, searchTerm, statusFilter, priorityFilter])

  // Add task with fallback to mock data
  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên công việc",
        variant: "destructive",
      })
      return
    }

    try {
      let success = false

      // Try Supabase first if configured and working
      if (supabaseWorking) {
        try {
          // Thay đổi cách xử lý deadline
          const taskToInsert = {
            ...newTask,
            deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
            description: newTask.description || null,
            category: (newTask as any).category || null,
            assignee: newTask.assignee || null,
            notes: (newTask as any).notes || null,
          }

          // Sử dụng taskToInsert thay vì newTask khi insert
          const { error } = await supabase.from("tasks").insert([taskToInsert])
          if (error) {
            console.error("Supabase insert error:", error)
            throw error
          }
          success = true
        } catch (supabaseError) {
          console.error("Supabase insert failed:", supabaseError)
          setSupabaseWorking(false)
          // Fall back to mock data
        }
      }

      // Use mock data if Supabase failed or not configured
      if (!success) {
        const { data, error } = await mockSupabaseOperations.insertTask(newTask)
        if (error) throw error
        if (data) {
          mockRealtimeSubscription.emit("INSERT", { new: data })
        }
      }

      toast({
        title: "Thành công",
        description: supabaseWorking ? "Đã thêm công việc mới" : "Đã thêm công việc mới (chế độ demo)",
      })

      // Reset form
      setNewTask({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "NOT_STARTED",
        assignee: "",
        deadline: "",
      })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm công việc. Vui lòng thử lại.",
        variant: "destructive",
      })
    }
  }

  // Update task with fallback
  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      let success = false

      if (supabaseWorking) {
        try {
          const { error } = await supabase
            .from("tasks")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
          if (error) throw error
          success = true
        } catch (supabaseError) {
          console.error("Supabase update failed:", supabaseError)
          setSupabaseWorking(false)
        }
      }

      if (!success) {
        const { data, error } = await mockSupabaseOperations.updateTask(id, updates)
        if (error) throw error
        if (data) {
          mockRealtimeSubscription.emit("UPDATE", { new: data })
        }
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật công việc",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật công việc",
        variant: "destructive",
      })
    }
  }

  // Delete task with fallback
  const handleDeleteTask = async (id: string) => {
    try {
      const taskToDelete = tasks.find((t) => t.id === id)
      let success = false

      if (supabaseWorking) {
        try {
          const { error } = await supabase.from("tasks").delete().eq("id", id)
          if (error) throw error
          success = true
        } catch (supabaseError) {
          console.error("Supabase delete failed:", supabaseError)
          setSupabaseWorking(false)
        }
      }

      if (!success) {
        const { error } = await mockSupabaseOperations.deleteTask(id)
        if (error) throw error
        if (taskToDelete) {
          mockRealtimeSubscription.emit("DELETE", { old: taskToDelete })
        }
      }

      toast({
        title: "Thành công",
        description: "Đã xóa công việc",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa công việc",
        variant: "destructive",
      })
    }
  }

  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">TASK LIST</h1>
              {supabaseWorking ? (
                <Wifi className="h-5 w-5 text-green-600" title="Kết nối Supabase thành công" />
              ) : isSupabaseConfigured ? (
                <AlertTriangle
                  className="h-5 w-5 text-orange-600"
                  title="Supabase được cấu hình nhưng không kết nối được"
                />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" title="Chế độ demo (không có Supabase)" />
              )}
            </div>
            <p className="text-gray-600">DL22CLC</p>
            {!supabaseWorking && (
              <p className="text-sm text-orange-600 mt-1">
                {isSupabaseConfigured
                  ? "Không thể kết nối Supabase - Đang sử dụng chế độ demo"
                  : "Chế độ demo - Cấu hình Supabase để lưu trữ dữ liệu"}
              </p>
            )}
          </div>
          <div className="bg-green-100 px-4 py-2 rounded-lg">
            <p className="text-sm text-green-600 font-medium">HÔM NAY</p>
            <p className="text-green-800 font-semibold">{today}</p>
          </div>
        </div>

        {/* Connection Status Alert */}
        {isSupabaseConfigured && !supabaseWorking && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-orange-800 font-medium">Không thể kết nối Supabase</p>
                <p className="text-orange-700 text-sm">
                  Vui lòng kiểm tra: 1) Bảng 'tasks' đã được tạo chưa, 2) RLS policies đã được thiết lập đúng chưa
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">TỔNG SỐ TASK</p>
                  <p className="text-3xl font-bold text-blue-900">{tasks.length}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">HOÀN THÀNH</p>
                  <p className="text-3xl font-bold text-green-900">
                    {tasks.filter((task) => task.status === "DONE").length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">ĐANG THỰC HIỆN</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {tasks.filter((task) => task.status === "IN_PROGRESS").length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">CHƯA BẮT ĐẦU</p>
                  <p className="text-3xl font-bold text-red-900">
                    {tasks.filter((task) => task.status === "NOT_STARTED").length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Management Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Danh sách công việc</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm công việc mới
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Thêm công việc mới</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Tên công việc</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Nhập tên công việc..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Mô tả</Label>
                      <Textarea
                        id="description"
                        value={newTask.description || ""}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Nhập mô tả..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priority">Độ ưu tiên</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value: Task["priority"]) => setNewTask({ ...newTask, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Thấp</SelectItem>
                            <SelectItem value="MEDIUM">Trung bình</SelectItem>
                            <SelectItem value="HIGH">Cao</SelectItem>
                            <SelectItem value="CRITICAL">Khẩn cấp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Trạng thái</Label>
                        <Select
                          value={newTask.status}
                          onValueChange={(value: Task["status"]) => setNewTask({ ...newTask, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Chưa bắt đầu</SelectItem>
                            <SelectItem value="IN_PROGRESS">Đang thực hiện</SelectItem>
                            <SelectItem value="DONE">Hoàn thành</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="assignee">Người thực hiện</Label>
                      <Input
                        id="assignee"
                        value={newTask.assignee || ""}
                        onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                        placeholder="Nhập tên người thực hiện..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Hạn chót</Label>
                      <Input
                        id="deadline"
                        type="datetime-local"
                        value={newTask.deadline || ""}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleAddTask} className="w-full">
                      Thêm công việc
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm theo tên task hoặc người thực hiện..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="NOT_STARTED">Chưa bắt đầu</SelectItem>
                  <SelectItem value="IN_PROGRESS">Đang thực hiện</SelectItem>
                  <SelectItem value="DONE">Hoàn thành</SelectItem>
                  <SelectItem value="OVERDUE">Quá hạn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tất cả độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả độ ưu tiên</SelectItem>
                  <SelectItem value="LOW">Thấp</SelectItem>
                  <SelectItem value="MEDIUM">Trung bình</SelectItem>
                  <SelectItem value="HIGH">Cao</SelectItem>
                  <SelectItem value="CRITICAL">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Task List */}
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Hiển thị {filteredTasks.length} trong tổng số {tasks.length} công việc
              </div>

              {/* Table Container with proper alignment */}
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_2fr_120px_120px_120px_150px_120px_120px] gap-4 p-4 bg-gray-50 rounded-lg font-medium text-sm text-gray-700 border-b">
                    <div className="flex items-center justify-center">✓</div>
                    <div className="flex items-center">Tên công việc</div>
                    <div className="flex items-center justify-center">Độ ưu tiên</div>
                    <div className="flex items-center justify-center">Hạn chót</div>
                    <div className="flex items-center justify-center">Trạng thái</div>
                    <div className="flex items-center justify-center">Người thực hiện</div>
                    <div className="flex items-center justify-center">Ghi chú</div>
                    <div className="flex items-center justify-center">Thao tác</div>
                  </div>

                  {/* Task Rows */}
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="grid grid-cols-[40px_2fr_120px_120px_120px_150px_120px_120px] gap-4 p-4 bg-white border-b hover:bg-gray-50 transition-colors items-center"
                    >
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={task.status === "DONE"}
                          onCheckedChange={(checked) => {
                            handleUpdateTask(task.id, { status: checked ? "DONE" : "NOT_STARTED" })
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{task.title}</div>
                        {task.description && <div className="text-sm text-gray-600 mt-1">{task.description}</div>}
                      </div>
                      <div className="flex justify-center">
                        <Badge className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Badge>
                      </div>
                      <div className="text-sm text-center">
                        {task.deadline ? format(new Date(task.deadline), "dd/MM/yyyy", { locale: vi }) : "Không có"}
                      </div>
                      <div className="flex justify-center">
                        <Badge className={statusColors[task.status]}>{statusLabels[task.status]}</Badge>
                      </div>
                      <div className="text-sm text-center truncate">{task.assignee || "Chưa phân công"}</div>
                      <div className="text-sm text-gray-600 text-center truncate">
                        {task.notes || "Không có ghi chú"}
                      </div>
                      <div className="flex justify-center">
                        <Select
                          value={task.status}
                          onValueChange={(value: Task["status"]) => handleUpdateTask(task.id, { status: value })}
                        >
                          <SelectTrigger className="h-8 text-xs w-full max-w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">Chưa bắt đầu</SelectItem>
                            <SelectItem value="IN_PROGRESS">Đang thực hiện</SelectItem>
                            <SelectItem value="DONE">Hoàn thành</SelectItem>
                            <SelectItem value="OVERDUE">Quá hạn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-12 text-gray-500 col-span-full">
                      <p>Không có công việc nào được tìm thấy</p>
                      {tasks.length === 0 && <p className="mt-2">Hãy thêm công việc đầu tiên của bạn!</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
