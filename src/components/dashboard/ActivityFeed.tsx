import React, { useState, useEffect } from "react";
import type { ActivityLog } from "../../types";
import { dbService } from "../../services/database";
import { ShoppingBag, Box, UserCheck, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";

interface ActivityFeedProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([dbService.getAllActivity(PAGE_SIZE, page * PAGE_SIZE), dbService.getActivityCount()]);
      setActivities(data);
      setTotal(count);
    } catch (err) {
      console.error("Failed to load activity feed", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingBag className='text-blue-500' size={14} />;
      case "stock":
        return <AlertCircle className='text-amber-500' size={14} />;
      case "auth":
        return <UserCheck className='text-emerald-500' size={14} />;
      default:
        return <Box className='text-slate-500' size={14} />;
    }
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-2 shrink-0'>
        <CardTitle>Activity Feed</CardTitle>
        {onNavigate && (
          <button onClick={() => onNavigate("settings", { activeTab: "logs" })} className='text-xs font-medium text-primary hover:underline hover:text-primary/80 transition-colors'>
            View All
          </button>
        )}
      </CardHeader>
      <CardContent className='flex-1 flex flex-col min-h-0 pt-0'>
        <div className='overflow-y-auto relative h-[50vh] flex-1'>
          {loading && activities.length === 0 ? (
            <div className='flex items-center justify-center h-full'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
            </div>
          ) : (
            <div className='space-y-6 pt-2'>
              {activities.map((activity) => (
                <div key={activity.id} className='flex space-x-4'>
                  <div className='relative'>
                    <div className='w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center z-10 relative'>{getIcon(activity.type)}</div>
                    <div className='absolute top-8 left-4 w-px h-full bg-slate-100 dark:bg-dark-border -z-0 last:hidden' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>
                      <span className='text-primary'>{activity.user}</span> {activity.action}
                    </p>
                    <p className='text-xs text-slate-500 mt-0.5'>{activity.target}</p>
                    <p className='text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold'>
                      {new Date(activity.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className='text-center text-sm text-slate-500 py-4'>No activity found.</p>}
            </div>
          )}
        </div>

        <div className='flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-dark-border shrink-0'>
          <span className='text-[10px] text-slate-400'>
            Page {page + 1}/{Math.max(1, totalPages)}
          </span>
          <div className='flex gap-1'>
            <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
