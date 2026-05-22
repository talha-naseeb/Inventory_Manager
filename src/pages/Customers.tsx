import { useState, useEffect } from "react";
import {
  Search, UserPlus, Phone, Mail, MapPin,
  ShoppingBag, Trash2, Edit2, ChevronRight,
  MoreVertical, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dbService } from "../services/database";
import type { Customer } from "../types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { usePermissions } from "../hooks/usePermissions";

interface CustomerOrder {
  id: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  items_summary: string;
}

const emptyForm = { name: "", phone: "", email: "", address: "" };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { isAdmin, isOwner } = usePermissions();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    ));
  }, [search, customers]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const rows = await dbService.searchCustomers(search);
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
      const orders = await dbService.getCustomerOrders(customerId);
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
        await dbService.updateCustomer(editingCustomer.id, form);
      } else {
        const id = crypto.randomUUID();
        await dbService.createCustomer({ id, ...form });
      }
      setShowModal(false);
      await loadCustomers();
      if (editingCustomer && selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, ...form } : prev));
      }
    } catch (_err) {
      setFormError("Failed to save customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"? Their order history will be kept but unlinked.`)) return;
    try {
      await dbService.deleteCustomer(customer.id);
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      await loadCustomers();
    } catch (_err) {
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
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return (
    <div className='flex h-full overflow-hidden bg-gray-50/50 dark:bg-gray-900/50'>
      {/* Sidebar List */}
      <div className='w-full max-w-md flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-800'>
          <div className='flex items-center justify-between mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Customers</h1>
            <Button onClick={openAdd} size='sm' className='rounded-full'>
              <UserPlus className='w-4 h-4 mr-2' />
              Add New
            </Button>
          </div>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <Input
              placeholder='Search by name, phone or email...'
              className='pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-none'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className='flex-1 overflow-y-auto'>
          {isLoading ? (
            <div className='p-12 text-center text-gray-500'>Loading customers...</div>
          ) : filtered.length === 0 ? (
            <div className='p-12 text-center text-gray-500'>
              <div className='mb-4 flex justify-center'>
                <User className='w-12 h-12 text-gray-300' />
              </div>
              <p className='text-lg font-medium'>No customers found</p>
              <p className='text-sm mt-1'>Try adjusting your search</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-100 dark:divide-gray-800'>
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className={`w-full p-4 flex items-center gap-4 transition-colors text-left
                    ${selectedCustomer?.id === customer.id ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                >
                  <div className='w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg'>
                    {getInitials(customer.name)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-gray-900 dark:text-white truncate'>{customer.name}</h3>
                    <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>{customer.phone || "No phone"}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${selectedCustomer?.id === customer.id ? "text-indigo-500 translate-x-1" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className='flex-1 flex flex-col min-w-0'>
        <AnimatePresence mode='wait'>
          {selectedCustomer ? (
            <motion.div
              key={selectedCustomer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className='flex-1 overflow-y-auto p-8'
            >
              {/* Header */}
              <div className='flex items-start justify-between mb-8'>
                <div className='flex items-center gap-6'>
                  <div className='w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-indigo-500/20'>
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <h2 className='text-3xl font-bold text-gray-900 dark:text-white'>{selectedCustomer.name}</h2>
                    <p className='text-gray-500 mt-1 flex items-center'>
                      Customer since {new Date(selectedCustomer.created_at || "").toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className='flex gap-3'>
                  <Button variant='outline' onClick={() => openEdit(selectedCustomer)}>
                    <Edit2 className='w-4 h-4 mr-2' />
                    Edit Profile
                  </Button>
                  {(isAdmin || isOwner) && (
                    <Button variant='ghost' className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20' onClick={() => handleDelete(selectedCustomer)}>
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-3 gap-8 mb-12'>
                <Card className='p-6 flex items-start gap-4'>
                  <div className='p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'>
                    <Phone className='w-6 h-6' />
                  </div>
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Phone Number</p>
                    <p className='font-semibold text-gray-900 dark:text-white'>{selectedCustomer.phone || "Not provided"}</p>
                  </div>
                </Card>
                <Card className='p-6 flex items-start gap-4'>
                  <div className='p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'>
                    <Mail className='w-6 h-6' />
                  </div>
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Email Address</p>
                    <p className='font-semibold text-gray-900 dark:text-white'>{selectedCustomer.email || "Not provided"}</p>
                  </div>
                </Card>
                <Card className='p-6 flex items-start gap-4'>
                  <div className='p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'>
                    <MapPin className='w-6 h-6' />
                  </div>
                  <div>
                    <p className='text-sm text-gray-500 mb-1'>Address</p>
                    <p className='font-semibold text-gray-900 dark:text-white leading-relaxed'>{selectedCustomer.address || "Not provided"}</p>
                  </div>
                </Card>
              </div>

              {/* Stats & Activity */}
              <div className='grid grid-cols-3 gap-8'>
                {/* Stats Summary */}
                <div className='col-span-1 space-y-6'>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-4'>Spending Overview</h3>
                  <div className='grid grid-cols-1 gap-4'>
                    <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm'>
                      <p className='text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold'>Total Spent</p>
                      <p className='text-3xl font-bold text-emerald-600'>${(selectedCustomer as any).totalSpent?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div className='bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm'>
                      <p className='text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold'>Total Orders</p>
                      <p className='text-3xl font-bold text-indigo-600'>{(selectedCustomer as any).orderCount || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className='col-span-2'>
                  <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-xl font-bold text-gray-900 dark:text-white'>Order History</h3>
                    <Button variant='ghost' size='sm' className='text-indigo-600'>View All</Button>
                  </div>

                  <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm'>
                    {loadingOrders ? (
                      <div className='p-12 text-center text-gray-500'>Loading orders...</div>
                    ) : customerOrders.length === 0 ? (
                      <div className='p-12 text-center text-gray-500'>
                        <ShoppingBag className='w-12 h-12 mx-auto mb-4 text-gray-200' />
                        <p>No orders found for this customer</p>
                      </div>
                    ) : (
                      <table className='w-full'>
                        <thead className='bg-gray-50 dark:bg-gray-900/50 text-left'>
                          <tr>
                            <th className='px-6 py-4 text-xs font-semibold text-gray-500 uppercase'>Order ID</th>
                            <th className='px-6 py-4 text-xs font-semibold text-gray-500 uppercase'>Items</th>
                            <th className='px-6 py-4 text-xs font-semibold text-gray-500 uppercase'>Date</th>
                            <th className='px-6 py-4 text-xs font-semibold text-gray-500 uppercase'>Total</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
                          {customerOrders.map((order) => (
                            <tr key={order.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                              <td className='px-6 py-4 text-sm font-medium text-gray-900 dark:text-white'>#{order.id.substring(0, 8)}</td>
                              <td className='px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-50'>{order.items_summary}</td>
                              <td className='px-6 py-4 text-sm text-gray-500 dark:text-gray-400'>{new Date(order.created_at).toLocaleDateString()}</td>
                              <td className='px-6 py-4 text-sm font-bold text-gray-900 dark:text-white'>${order.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className='flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center'>
              <div className='w-24 h-24 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6'>
                <User className='w-12 h-12 text-gray-300' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Select a Customer</h2>
              <p className='max-w-xs mx-auto'>Choose a customer from the left sidebar to view their full profile, orders, and spending habits.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className='bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl'>
              <div className='px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between'>
                <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>{editingCustomer ? "Edit Customer" : "New Customer"}</h3>
                <button onClick={() => setShowModal(false)} className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'>
                  <MoreVertical className='w-6 h-6 rotate-90' />
                </button>
              </div>

              <div className='p-8 space-y-6'>
                {formError && (
                  <div className='p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium'>
                    {formError}
                  </div>
                )}

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>Full Name</label>
                    <Input placeholder='Enter customer name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>Phone Number</label>
                      <Input placeholder='+1 234 567 890' value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>Email Address</label>
                      <Input type='email' placeholder='alex@example.com' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>Physical Address</label>
                    <Input placeholder='Street, City, Postal Code' value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className='px-8 py-6 bg-gray-50 dark:bg-gray-800/50 flex gap-3 justify-end'>
                <Button variant='ghost' onClick={() => setShowModal(false)} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className='px-8'>
                  {isSaving ? "Saving..." : editingCustomer ? "Update Customer" : "Create Customer"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
