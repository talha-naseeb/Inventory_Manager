import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Shield, UserPlus, Edit2, Trash2, X, Eye, EyeOff, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Staff } from "../../types";

const ROLES: Staff["role"][] = ["owner", "admin", "manager", "cashier"];

const roleBadgeColor: Record<Staff["role"], string> = {
  owner:   "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  admin:   "bg-primary/10 text-primary",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  cashier: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const emptyForm = { name: "", pin: "", role: "cashier" as Staff["role"], status: "active" as Staff["status"] };

export const StaffSettings: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.staff?.list) {
        const data = await window.electronAPI.staff.list();
        setStaff(data as Staff[]);
      }
    } catch (err) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowPin(false);
    setIsModalOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setForm({ name: member.name, pin: "", role: member.role, status: member.status });
    setError(null);
    setShowPin(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setError(null);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError("Name is required.");
    if (!editing && !form.pin.trim()) return setError("PIN is required for new staff.");
    if (form.pin && !/^\d{4,8}$/.test(form.pin)) return setError("PIN must be 4–8 digits.");

    setSaving(true);
    setError(null);

    try {
      if (editing) {
        const result = await window.electronAPI.staff.update({
          id: editing.id,
          name: form.name.trim(), role: form.role, status: form.status, pin: form.pin || undefined,
        });
        if (!result?.success) throw new Error(result?.error || "Update failed");
        showSuccess(`${form.name} updated successfully.`);
      } else {
        const result = await window.electronAPI.staff.create({ name: form.name.trim(), pin: form.pin, role: form.role });
        if (!result?.success) throw new Error(result?.error || "Create failed");
        showSuccess(`${form.name} added successfully.`);
      }
      closeModal();
      await loadStaff();
    } catch (err: any) {
      setError(err.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.staff.delete({ id });
      setDeleteConfirm(null);
      showSuccess("Staff member removed.");
      await loadStaff();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-semibold"
          >
            <CheckCircle size={16} /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Staff Management</CardTitle>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <UserPlus size={16} /> Add Staff
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Shield size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No staff members yet. Add your first one.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white">{member.name}</h5>
                      <span className={cn("inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", roleBadgeColor[member.role])}>
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", member.status === "active" ? "bg-emerald-500" : "bg-slate-300")} />
                      <span className="text-xs font-medium text-slate-500 capitalize">{member.status}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => setDeleteConfirm(member.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing ? "Edit Staff Member" : "Add Staff Member"}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    PIN {editing && <span className="text-xs font-normal text-slate-400">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      value={form.pin}
                      onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      placeholder={editing ? "Enter new PIN to change" : "4–8 digit PIN"}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Staff["role"] })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none capitalize"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">{r}</option>
                    ))}
                  </select>
                </div>

                {editing && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as Staff["status"] })}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-rose-600 font-medium">{error}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Staff"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4"
            >
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Remove Staff Member?</h3>
                <p className="text-sm text-slate-500 mt-1">This cannot be undone. Their login history will be preserved.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-rose-600 hover:bg-rose-700 border-0"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  Remove
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
