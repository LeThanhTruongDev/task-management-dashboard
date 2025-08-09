import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react"
import type { Task } from "@/lib/supabase"

interface TaskStatsProps {
  tasks: Task[]
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === "DONE").length
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS").length
  const notStartedTasks = tasks.filter((task) => task.status === "NOT_STARTED").length

  const stats = [
    {
      title: "TỔNG SỐ TASK",
      value: totalTasks,
      icon: Calendar,
      color: "bg-blue-50 text-blue-600",
      iconColor: "text-blue-600",
    },
    {
      title: "HOÀN THÀNH",
      value: completedTasks,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      iconColor: "text-green-600",
    },
    {
      title: "ĐANG THỰC HIỆN",
      value: inProgressTasks,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      iconColor: "text-yellow-600",
    },
    {
      title: "CHƯA BẮT ĐẦU",
      value: notStartedTasks,
      icon: AlertCircle,
      color: "bg-red-50 text-red-600",
      iconColor: "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className={`${stat.color} border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{stat.title}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
