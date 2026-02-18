import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Search, Phone, Mail, MapPin, Trash2, Edit2, X, ShoppingBag, ChevronRight, User, Save, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { dbService } from "../services/database";
import { useThemeStore } from "../store/useThemeStore";
import { Button } from "../components/ui/Button";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  orderCount?: number;
  totalSpent?: number;
}

interface CustomerOrder {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  items_summary: string | null; // comma-separated: "Name x2, Name x1"
}

const emptyForm = { name: "", phone: "", email: "", address: "" };

export const Customers: React.FC = () => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  // Detail panel
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q)));
  }, [search, customers]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const rows = await dbService.query<Customer>(`
        SELECT 
          c.*,
          COUNT(o.id) as orderCount,
          COALESCE(SUM(o.total), 0) as totalSpent
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `);
      setCustomers(rows);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerOrders = async (customerId: string) => {
    setLoadingOrders(true);
    try {
      const orders = await dbService.query<CustomerOrder>(
        `
        SELECT 
          o.id, o.total, o.status, o.payment_method, o.created_at,
          GROUP_CONCAT(oi.name || ' x' || oi.quantity, ', ') as items_summary
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.customer_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 20
      `,
        [customerId],
      );
      setCustomerOrders(orders);
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await dbService.execute(`UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=?`, [
          form.name.trim(),
          form.phone || null,
          form.email || null,
          form.address || null,
          editingCustomer.id,
        ]);
      } else {
        const id = crypto.randomUUID();
        await dbService.execute(`INSERT INTO customers (id, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`, [id, form.name.trim(), form.phone || null, form.email || null, form.address || null]);
      }
      setShowModal(false);
      await loadCustomers();
      // Refresh selected customer if editing
      if (editingCustomer && selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, ...form } : prev));
      }
    } catch (err) {
      setFormError("Failed to save customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"? Their order history will be kept but unlinked.`)) return;
    try {
      await dbService.execute(`DELETE FROM customers WHERE id=?`, [customer.id]);
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      await loadCustomers();
    } catch (err) {
      alert("Failed to delete customer.");
    }
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    loadCustomerOrders(c.id);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const avatarColors = [
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];
  const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className='flex gap-6 h-[calc(100vh-120px)]'>
      {/* ── LEFT: Customer List ── */}
      <div className='flex flex-col flex-1 min-w-0'>
        {/* Header */}
        <div className='flex items-center justify-between mb-5'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>Customers</h1>
            <p className='text-slate-500 dark:text-slate-400 mt-0.5'>
              {customers.length} customer{customers.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus size={16} className='mr-2' /> Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className='relative mb-4'>
          <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search by name, phone, or email...'
            className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40'
          />
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto space-y-2 pr-1'>
          {isLoading ? (
            <div className='flex items-center justify-center h-40'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-40 text-slate-400'>
              <Users size={40} className='mb-3 opacity-30' />
              <p className='font-medium'>{search ? "No customers match your search" : "No customers yet"}</p>
              {!search && <p className='text-sm mt-1'>Click "Add Customer" to get started</p>}
            </div>
          ) : (
            filtered.map((customer) => (
              <motion.div
                key={customer.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => selectCustomer(customer)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all group",
                  selectedCustomer?.id === customer.id
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border hover:border-primary/30 hover:shadow-sm",
                )}
              >
                {/* Avatar */}
                <div className={cn("w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shrink-0", getColor(customer.name))}>{getInitials(customer.name)}</div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <p className='font-bold text-slate-900 dark:text-white truncate'>{customer.name}</p>
                  <div className='flex items-center gap-3 mt-0.5'>
                    {customer.phone && (
                      <span className='flex items-center gap-1 text-xs text-slate-500'>
                        <Phone size={11} /> {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className='flex items-center gap-1 text-xs text-slate-500 truncate'>
                        <Mail size={11} /> {customer.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className='text-right shrink-0'>
                  <p className='text-sm font-bold text-slate-900 dark:text-white'>
                    {currency} {(customer.totalSpent || 0).toFixed(0)}
                  </p>
                  <p className='text-xs text-slate-400'>{customer.orderCount || 0} orders</p>
                </div>

                {/* Actions */}
                <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(customer);
                    }}
                    className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors'
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(customer);
                    }}
                    className='p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <ChevronRight size={16} className={cn("text-slate-300 shrink-0 transition-colors", selectedCustomer?.id === customer.id && "text-primary")} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Customer Detail Panel ── */}
      <div className='w-80 shrink-0 border-l border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/50 relative overflow-hidden'>
        <AnimatePresence mode='popLayout'>
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className='absolute inset-0 flex flex-col gap-4 overflow-y-auto p-4'
            >
              {/* Profile Card */}
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-5 shrink-0'>
                <div className='flex items-start justify-between mb-4'>
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg", getColor(selectedCustomer.name))}>{getInitials(selectedCustomer.name)}</div>
                  <div className='flex gap-1'>
                    <button onClick={() => openEdit(selectedCustomer)} className='p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors'>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => setSelectedCustomer(null)} className='p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors'>
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <h2 className='font-bold text-lg text-slate-900 dark:text-white'>{selectedCustomer.name}</h2>
                <p className='text-xs text-slate-400 mt-0.5'>Customer since {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>

                <div className='mt-4 space-y-2.5'>
                  {selectedCustomer.phone && (
                    <div className='flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400'>
                      <Phone size={14} className='text-slate-400 shrink-0' /> {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className='flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400'>
                      <Mail size={14} className='text-slate-400 shrink-0' /> {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className='flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400'>
                      <MapPin size={14} className='text-slate-400 shrink-0 mt-0.5' /> {selectedCustomer.address}
                    </div>
                  )}
                  {!selectedCustomer.phone && !selectedCustomer.email && !selectedCustomer.address && <p className='text-xs text-slate-400 italic'>No contact info added</p>}
                </div>

                {/* Stats */}
                <div className='grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-dark-border'>
                  <div className='text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl'>
                    <p className='text-lg font-black text-slate-900 dark:text-white'>{selectedCustomer.orderCount || 0}</p>
                    <p className='text-xs text-slate-500'>Orders</p>
                  </div>
                  <div className='text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl'>
                    <p className='text-lg font-black text-slate-900 dark:text-white'>
                      {currency} {(selectedCustomer.totalSpent || 0).toFixed(0)}
                    </p>
                    <p className='text-xs text-slate-500'>Total Spent</p>
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-5 flex-1'>
                <h3 className='font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2'>
                  <ShoppingBag size={16} className='text-primary' /> Purchase History
                </h3>

                {loadingOrders ? (
                  <div className='flex justify-center py-6'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary' />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className='text-center py-6 text-slate-400'>
                    <ShoppingBag size={28} className='mx-auto mb-2 opacity-30' />
                    <p className='text-sm'>No orders yet</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {customerOrders.map((order) => (
                      <div key={order.id} className='p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2'>
                        {/* Order header */}
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-xs font-mono text-slate-400'>#{order.id.slice(0, 8)}</p>
                            <p className='text-xs text-slate-500 mt-0.5'>{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-bold text-slate-900 dark:text-white'>
                              {currency} {order.total.toFixed(2)}
                            </p>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", order.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                              {order.payment_method}
                            </span>
                          </div>
                        </div>
                        {/* Item names */}
                        {order.items_summary && (
                          <div className='flex flex-wrap gap-1 pt-1 border-t border-slate-200 dark:border-slate-700'>
                            {order.items_summary.split(", ").map((item, i) => (
                              <span
                                key={i}
                                className='text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium'
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='absolute inset-0 flex items-center justify-center'>
              <div className='text-center text-slate-300 dark:text-slate-600'>
                <User size={48} className='mx-auto mb-3' />
                <p className='text-sm font-medium'>
                  Select a customer
                  <br />
                  to view details
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className='bg-white dark:bg-dark-surface rounded-3xl shadow-2xl w-full max-w-md p-6'
            >
              <div className='flex items-center justify-between mb-5'>
                <h2 className='text-xl font-black text-slate-900 dark:text-white'>{editingCustomer ? "Edit Customer" : "New Customer"}</h2>
                <button onClick={() => setShowModal(false)} className='p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors'>
                  <X size={18} />
                </button>
              </div>

              <div className='space-y-4'>
                {/* Name */}
                <div>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block'>
                    Full Name <span className='text-rose-500'>*</span>
                  </label>
                  <div className='relative'>
                    <User size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                    <input
                      type='text'
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder='e.g. Ahmed Khan'
                      className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40'
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block'>Phone</label>
                  <div className='relative'>
                    <Phone size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                    <input
                      type='tel'
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder='e.g. 0300-1234567'
                      className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40'
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block'>Email</label>
                  <div className='relative'>
                    <Mail size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400' />
                    <input
                      type='email'
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder='e.g. ahmed@example.com'
                      className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40'
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block'>Address</label>
                  <div className='relative'>
                    <MapPin size={15} className='absolute left-3.5 top-3 text-slate-400' />
                    <textarea
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder='e.g. Shop 5, Main Market, Lahore'
                      rows={2}
                      className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none'
                    />
                  </div>
                </div>

                {formError && <p className='text-sm text-rose-600 font-medium'>❌ {formError}</p>}
              </div>

              <div className='flex gap-3 mt-6'>
                <Button variant='outline' onClick={() => setShowModal(false)} className='flex-1'>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className='flex-1'>
                  {isSaving ? <RefreshCw size={15} className='animate-spin mr-2' /> : <Save size={15} className='mr-2' />}
                  {editingCustomer ? "Save Changes" : "Add Customer"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
