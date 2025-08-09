"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { EditTaskDialog } from "@/components/edit-task-dialog"
import type { Task } from "@/lib/supabase"

interface TaskTableProps {
  tasks: Task[]
  loading: boolean
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onDeleteTask: (id: string) => void
}

export function TaskTable({ tasks, loading, onUpdateTask, onDeleteTask }: TaskTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(tasks.map((task) => task.id))
    } else {
      setSelectedTasks([])
    }
  }

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId])
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId))
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    }

    const labels = {
      LOW: "Thấp",
      MEDIUM: "Trung bình",
      HIGH: "Cao",
      CRITICAL: "Khẩn cấp",
    }

    return (
      <Badge className={variants[priority as keyof typeof variants]}>{labels[priority as keyof typeof labels]}</Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      NOT_STARTED: "bg-gray-100 text-gray-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      DONE: "bg-green-100 text-green-800",
    }

    const labels = {
      NOT_STARTED: "Chưa bắt đầu",
      IN_PROGRESS: "Đang thực hiện",
      DONE: "Hoàn thành",
    }

    return <Badge className={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa xác định"
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Hiển thị {tasks.length} trong tổng số {tasks.length} công việc
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Tên công việc</TableHead>
              <TableHead>Độ ưu tiên</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Hạn chót</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                  Chưa có công việc nào. Hãy thêm công việc mới!
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>{task.category || "Chưa phân loại"}</TableCell>
                  <TableCell>{formatDate(task.deadline)}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>{task.assignee || "Chưa phân công"}</TableCell>
                  <TableCell className="max-w-32 truncate">{task.notes || "Không có ghi chú"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onUpdateTask={onUpdateTask}
        />
      )}
    </>
  )
}
