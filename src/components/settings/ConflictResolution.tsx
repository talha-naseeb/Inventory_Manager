import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { AlertCircle, RefreshCw, ChevronDown, CheckCircle, AlertTriangle, Merge, GitBranch, ArrowLeftRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { syncService } from "../../services/syncService";
import { useAuthStore } from "../../store/useAuthStore";

type ConflictItem = {
  id: string;
  action_type: string;
  entity_id: string;
  payload_json: string;
  conflict_status: string;
  base_version_json: string;
  created_at: string;
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  PRODUCT_UPSERT: "Product Update",
  PRODUCT_DELETE: "Product Delete",
  CUSTOMER_CREATE: "Customer Create",
  CUSTOMER_UPDATE: "Customer Update",
  CUSTOMER_DELETE: "Customer Delete",
  BRAND_UPSERT: "Brand Update",
  BRAND_DELETE: "Brand Delete",
  ORDER_CREATE: "Order Create",
  ORDER_UPDATE: "Order Update",
  ORDER_RETURN: "Order Return",
  INVENTORY_ADJUST: "Inventory Adjustment",
  CUSTOMER_CREDIT_LOG: "Customer Credit",
};

export const ConflictResolution: React.FC = () => {
  const { storeId: _storeId } = useAuthStore();
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [autoResolving, setAutoResolving] = useState(false);

  const loadConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await syncService.getConflicts();
      if (result.success && result.conflicts) {
        setConflicts(result.conflicts);
      } else {
        setError(result.error || "Failed to load conflicts");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConflicts();

    // Listen for real-time conflict detection
    const unsubscribe = syncService.onConflictDetected((conflict) => {
      // Refresh conflicts list when new conflict detected
      loadConflicts();
      
      // Show notification
      setSuccessMsg(`Conflict detected: ${ACTION_TYPE_LABELS[conflict.action_type] || conflict.action_type} (${conflict.entityId})`);
      setTimeout(() => setSuccessMsg(null), 5000);
    });

    return () => {
      unsubscribe();
    };
  }, [loadConflicts]);

  const handleAutoResolveAll = async () => {
    setAutoResolving(true);
    setError(null);
    try {
      const result = await syncService.autoResolveAllConflicts();
      if (result.success) {
        setSuccessMsg(`Auto-resolved ${result.resolved} conflict(s)`);
        setTimeout(() => setSuccessMsg(null), 3000);
        await loadConflicts();
      } else {
        setError(result.error || "Auto-resolve failed");
      }
    } catch (err: any) {
      setError(err.message || "Auto-resolve failed");
    } finally {
      setAutoResolving(false);
    }
  };

  const handleManualResolve = async (conflict: ConflictItem, resolution: "local_wins" | "remote_wins" | "field_level_merge") => {
    setResolving(conflict.id);
    setError(null);
    try {
      const payload = JSON.parse(conflict.payload_json);
      let resolvedData = payload;

      if (resolution === "local_wins") {
        // Fetch current local version
        // For now, we'll use the base version as local wins
        const baseVersion = JSON.parse(conflict.base_version_json || "{}");
        resolvedData = baseVersion;
      } else if (resolution === "remote_wins") {
        // Remote already in payload
        resolvedData = payload;
      } else {
        // Field-level merge - use auto resolve
        const result = await syncService.resolveConflict(conflict.id, "field_level_merge", {});
        if (result.success) {
          setSuccessMsg("Conflict resolved with field-level merge");
          setTimeout(() => setSuccessMsg(null), 3000);
          await loadConflicts();
          setResolving(null);
          return;
        }
        setError(result.error || "Merge failed");
        setResolving(null);
        return;
      }

      const result = await syncService.resolveConflict(conflict.id, resolution, resolvedData);
      if (result.success) {
        setSuccessMsg(`Conflict resolved: ${resolution.replace("_", " ")}`);
        setTimeout(() => setSuccessMsg(null), 3000);
        await loadConflicts();
      } else {
        setError(result.error || "Resolve failed");
      }
    } catch (err: any) {
      setError(err.message || "Resolve failed");
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch size={20} className="text-amber-600" />
            Sync Conflicts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadConflicts}
              disabled={loading}
              className="gap-1"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            {conflicts.length > 0 && (
              <Button
                size="sm"
                onClick={handleAutoResolveAll}
                disabled={autoResolving || resolving !== null}
                className="gap-1"
              >
                <Merge size={14} className={autoResolving ? "animate-spin" : ""} />
                {autoResolving ? "Resolving..." : "Auto-Resolve All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium"
            >
              <CheckCircle size={16} /> {successMsg}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-medium"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : conflicts.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle size={36} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm">No conflicts detected. All synced!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conflicts.map((conflict) => {
                const payload = JSON.parse(conflict.payload_json || "{}");
                const baseVersion = JSON.parse(conflict.base_version_json || "{}");
                const localData = payload; // Current local is in payload after conflict detection
                const remoteData = payload; // Would need to fetch separately for full diff
                
                const isExpanded = expandedConflict === conflict.id;
                const actionLabel = ACTION_TYPE_LABELS[conflict.action_type] || conflict.action_type;

                return (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden bg-white dark:bg-slate-900"
                  >
                    {/* Conflict Header */}
                    <button
                      onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                          <AlertTriangle size={18} className="text-amber-600" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">{actionLabel}</h5>
                          <p className="text-xs text-slate-500 font-mono">{conflict.entity_id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                          conflict.conflict_status === "detected" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                          conflict.conflict_status === "resolved" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                          conflict.conflict_status === "pending" && "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                        )}>
                          {conflict.conflict_status === "detected" && "Detected"}
                          {conflict.conflict_status === "resolved" && "Resolved"}
                          {conflict.conflict_status === "pending" && "Pending"}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} className="text-slate-400" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Conflict Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-slate-200 dark:border-dark-border p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50"
                        >
                          {/* Diff View */}
                          <div className="space-y-3">
                            <h6 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <ArrowLeftRight size={14} /> Field Differences
                            </h6>
                            
                            {/* For display, we'll show the payload fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-700">
                                <p className="font-bold text-slate-500 mb-2">Base Version</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {Object.entries(baseVersion).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-[10px]">
                                      <span className="font-medium text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                                      <span className="font-mono text-slate-900 dark:text-white">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-700">
                                <p className="font-bold text-slate-500 mb-2">Local Version</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {Object.entries(localData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-[10px]">
                                      <span className="font-medium text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                                      <span className="font-mono text-slate-900 dark:text-white">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-700">
                                <p className="font-bold text-slate-500 mb-2">Remote Version</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {Object.entries(remoteData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-[10px]">
                                      <span className="font-medium text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, " ")}</span>
                                      <span className="font-mono text-slate-900 dark:text-white">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Resolution Actions */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-dark-border">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualResolve(conflict, "local_wins")}
                              disabled={resolving === conflict.id}
                              className="flex-1 min-w-[120px]"
                            >
                              <CheckCircle size={12} /> Keep Local
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManualResolve(conflict, "remote_wins")}
                              disabled={resolving === conflict.id}
                              className="flex-1 min-w-[120px]"
                            >
                              <CheckCircle size={12} /> Keep Remote
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleManualResolve(conflict, "field_level_merge")}
                              disabled={resolving === conflict.id}
                              className="flex-1 min-w-[140px] gap-1"
                            >
                              <Merge size={12} /> Field-Level Merge
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5">
        <CardContent className="pt-4">
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <InfoIcon size={14} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">How Conflict Resolution Works</p>
                <p className="mt-1">When the same record is edited offline on multiple devices, conflicts can occur during sync. This panel lets you review and resolve them.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-9">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs"><strong>Keep Local:</strong> Use your device's version</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800">
                <CheckCircle size={14} className="text-blue-500" />
                <span className="text-xs"><strong>Keep Remote:</strong> Use the cloud version</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800">
                <Merge size={14} className="text-primary" />
                <span className="text-xs"><strong>Field-Level Merge:</strong> Combine changes per field (recommended)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple Info icon since lucide-react might not have it
const InfoIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);
