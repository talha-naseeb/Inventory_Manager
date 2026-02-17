import React from "react";
import type { ActivityLog } from "../../types";
import { ShoppingBag, Box, UserCheck, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface ActivityFeedProps {
  activities: ActivityLog[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
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
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
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
                <p className='text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold'>{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
