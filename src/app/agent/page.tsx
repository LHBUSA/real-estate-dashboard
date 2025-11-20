'use client';

import { 
  Home, 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  Phone, 
  Mail, 
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function AgentDashboard() {
  // Sample data - in a real app, this would come from an API or state management
  const stats = {
    activeListings: 12,
    pendingCommission: 145000,
    newLeads: 8,
  };

  const recentActivity = [
    {
      id: 1,
      client: 'Sarah Johnson',
      action: 'Viewing scheduled',
      property: '123 Oak Street',
      time: '2 hours ago',
      type: 'viewing',
    },
    {
      id: 2,
      client: 'Michael Chen',
      action: 'Offer submitted',
      property: '456 Maple Ave',
      time: '5 hours ago',
      type: 'offer',
    },
    {
      id: 3,
      client: 'Emily Rodriguez',
      action: 'Contract signed',
      property: '789 Pine Road',
      time: '1 day ago',
      type: 'contract',
    },
    {
      id: 4,
      client: 'David Kim',
      action: 'Inspection completed',
      property: '321 Elm Drive',
      time: '2 days ago',
      type: 'inspection',
    },
  ];

  const urgentTasks = [
    {
      id: 1,
      title: 'Follow up with Sarah Johnson',
      description: 'Send property details for 123 Oak Street',
      priority: 'high',
      dueDate: 'Today, 3:00 PM',
      completed: false,
    },
    {
      id: 2,
      title: 'Review counter-offer from buyer',
      description: '456 Maple Ave - Response needed by EOD',
      priority: 'high',
      dueDate: 'Today, 5:00 PM',
      completed: false,
    },
    {
      id: 3,
      title: 'Schedule final walkthrough',
      description: '789 Pine Road - Closing in 3 days',
      priority: 'medium',
      dueDate: 'Tomorrow, 10:00 AM',
      completed: false,
    },
    {
      id: 4,
      title: 'Update MLS listing photos',
      description: '321 Elm Drive - Professional photos ready',
      priority: 'medium',
      dueDate: 'Tomorrow, 2:00 PM',
      completed: false,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'viewing':
        return Calendar;
      case 'offer':
        return DollarSign;
      case 'contract':
        return CheckCircle2;
      case 'inspection':
        return Home;
      default:
        return Clock;
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-3xl font-bold text-slate-900">Agent Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Welcome back! Here's your overview.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Active Listings */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Listings</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.activeListings}</p>
                <p className="mt-1 text-xs text-slate-500">+2 from last month</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <Home className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Pending Commission */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Commission</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  ${stats.pendingCommission.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">3 deals in progress</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* New Leads */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">New Leads</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.newLeads}</p>
                <p className="mt-1 text-xs text-slate-500">This week</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Urgent Tasks */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Client Activity */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Recent Client Activity</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-slate-100 p-2">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{activity.client}</p>
                        <p className="mt-1 text-sm text-slate-600">{activity.action}</p>
                        <p className="mt-1 text-xs text-slate-500">{activity.property}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button className="flex w-full items-center justify-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                View all activity
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Urgent Tasks</h2>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  {urgentTasks.filter((t) => !t.completed).length} pending
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`px-6 py-4 bg-white border-l-2 ${getPriorityBorderColor(task.priority)} hover:bg-slate-50 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold text-slate-900 leading-tight">{task.title}</h3>
                      </div>
                      <p className="mt-2 ml-7 text-sm text-slate-600 leading-relaxed">{task.description}</p>
                      <div className="mt-3 ml-7 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">{task.dueDate}</span>
                        </div>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            task.priority === 'high'
                              ? 'text-red-600'
                              : task.priority === 'medium'
                              ? 'text-yellow-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    {task.priority === 'high' && !task.completed && (
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button className="flex w-full items-center justify-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                View all tasks
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

