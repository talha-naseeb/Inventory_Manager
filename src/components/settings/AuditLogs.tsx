import React, { useState, useEffect, useCallback } from "react";
import type { ActivityLog } from "../../types";
import { dbService } from "../../services/database";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { UserCheck, ShoppingBag, Box, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([dbService.getAllActivity(PAGE_SIZE, page * PAGE_SIZE), dbService.getActivityCount()]);
      setLogs(data);
      setTotalCount(count);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingBag className='text-blue-500' size={16} />;
      case "stock":
        return <AlertCircle className='text-amber-500' size={16} />;
      case "auth":
        return <UserCheck className='text-emerald-500' size={16} />;
      default:
        return <Box className='text-slate-500' size={16} />;
    }
  };

  return (
    <Card className='border-none shadow-sm dark:bg-dark-surface h-full flex flex-col'>
      <CardHeader className='pb-4 border-b border-slate-50 dark:border-dark-border flex flex-row items-center justify-between shrink-0'>
        <CardTitle className='text-lg'>System Audit Logs</CardTitle>
        <Button variant='outline' size='sm' onClick={loadLogs} className='gap-2'>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className='pt-0 flex-1 flex flex-col min-h-0'>
        <div className='overflow-y-auto relative h-[50vh]'>
          {loading && logs.length === 0 ? (
            <div className='flex items-center justify-center p-8 absolute inset-0'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          ) : ( 
            <div className='relative'>
              <table className='w-full  text-sm text-left text-slate-500 dark:text-slate-400'>
                <thead className='text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300 sticky top-0 z-10'>
                  <tr>
                    <th className='px-6 py-3 bg-slate-50 dark:bg-slate-700'>Type</th>
                    <th className='px-6 py-3 bg-slate-50 dark:bg-slate-700'>Timestamp</th>
                    <th className='px-6 py-3 bg-slate-50 dark:bg-slate-700'>User</th>
                    <th className='px-6 py-3 bg-slate-50 dark:bg-slate-700'>Action</th>
                    <th className='px-6 py-3 bg-slate-50 dark:bg-slate-700'>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className='bg-white border-b dark:bg-dark-surface dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/50'>
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-2'>
                          {getIcon(log.type)}
                          <span className='capitalize font-medium text-slate-900 dark:text-white'>{log.type}</span>
                        </div>
                      </td>
                      <td className='px-6 py-4 font-mono text-xs'>
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className='px-6 py-4'>
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'>{log.user}</span>
                      </td>
                      <td className='px-6 py-4 font-medium text-slate-900 dark:text-white'>{log.action}</td>
                      <td className='px-6 py-4 text-xs'>{log.target}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className='px-6 py-8 text-center text-slate-400'>
                        No activity logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className='flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-dark-border shrink-0 bg-white dark:bg-dark-surface z-20'>
          <span className='text-xs text-slate-500'>
            Page {page + 1} of {Math.max(1, totalPages)} ({totalCount} items)
          </span>
          <div className='flex gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
              <ChevronLeft size={16} /> Previous
            </Button>
            <Button variant='ghost' size='sm' onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
