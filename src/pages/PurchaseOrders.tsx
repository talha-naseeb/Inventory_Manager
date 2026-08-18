import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Truck, Package, Calendar, Clock, CheckCircle2, XCircle, ChevronRight, UserPlus, Building2, Phone, Mail, MapPin, Edit2, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { dbService } from "../services/database";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../lib/utils";
import { POModal } from "../components/inventory/POModal";
import { SupplierModal } from "../components/inventory/SupplierModal";

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

interface PO {
  id: string;
  supplierId: string;
  supplierName: string;
  status: "pending" | "received" | "cancelled";
  totalAmount: number;
  referenceNumber: string;
  notes: string;
  receivedAt: string | null;
  createdAt: string;
}

export const PurchaseOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"orders" | "suppliers">("orders");
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const { can } = usePermissions();

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await dbService.listSuppliers();
      setSuppliers(data.map(s => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contact_person,
        phone: s.phone,
        email: s.email,
        address: s.address
      })));
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await dbService.listPurchaseOrders();
      setOrders(data.map(o => ({
        id: o.id,
        supplierId: o.supplier_id,
        supplierName: o.supplier_name || "Unknown Supplier",
        status: o.status,
        totalAmount: o.total_amount,
        referenceNumber: o.reference_number,
        notes: o.notes,
        receivedAt: o.received_at,
        createdAt: o.created_at
      })));
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
  }, [fetchSuppliers, fetchOrders]);

  const handleCreatePO = () => {
    setSelectedPO(null);
    setIsPOModalOpen(true);
  };

  const handleReceivePO = async (po: PO) => {
    if (!confirm(`Are you sure you want to receive PO #${po.referenceNumber || po.id.slice(0,8)}? This will increase product stock.`)) return;
    
    try {
      await dbService.receivePurchaseOrder(po.id);
      fetchOrders();
    } catch (err) {
      console.error("Failed to receive PO:", err);
      alert("Error receiving PO. See logs.");
    }
  };

  const filteredOrders = orders.filter(o => 
    o.supplierName.toLowerCase().includes(search.toLowerCase()) || 
    o.referenceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.contactPerson?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Procurement</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage suppliers and incoming stock</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "orders" ? (
            <Button onClick={handleCreatePO} className="gap-2">
              <Plus size={18} />
              New Purchase Order
            </Button>
          ) : (
            <Button onClick={() => { setSelectedSupplier(null); setIsSupplierModalOpen(true); }} className="gap-2">
              <UserPlus size={18} />
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-8 mb-6 border-b border-slate-200 dark:border-dark-border">
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "orders" ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Purchase Orders
          {activeTab === "orders" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={cn(
            "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "suppliers" ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Suppliers
          {activeTab === "suppliers" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder={activeTab === "orders" ? "Search orders by supplier or ref..." : "Search suppliers by name..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-2xl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === "orders" ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-dark-surface rounded-3xl border border-slate-100 dark:border-dark-border">
                <Truck size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">No purchase orders found</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <Card key={order.id} className="p-0 overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        order.status === 'received' ? "bg-emerald-50 text-emerald-600" : 
                        order.status === 'cancelled' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {order.status === 'received' ? <CheckCircle2 size={24} /> : 
                         order.status === 'cancelled' ? <XCircle size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100">{order.supplierName}</h3>
                          <span className="text-xs font-medium text-slate-400">#{order.referenceNumber || order.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar size={12} />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-primary">
                            <Package size={12} />
                            PKR {order.totalAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'received' ? "bg-emerald-100 text-emerald-700" : 
                        order.status === 'cancelled' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {order.status}
                      </div>
                      
                      {order.status === 'pending' && can("manage_inventory") && (
                        <Button variant="outline" size="sm" onClick={() => handleReceivePO(order)} className="text-emerald-600 hover:bg-emerald-50">
                          Receive Items
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="icon" className="text-slate-400">
                        <ChevronRight size={20} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white dark:bg-dark-surface rounded-3xl border border-slate-100 dark:border-dark-border">
                <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">No suppliers found</p>
              </div>
            ) : (
              filteredSuppliers.map(supplier => (
                <Card key={supplier.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-dark-bg rounded-2xl flex items-center justify-center text-slate-500">
                      <Building2 size={24} />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => { setSelectedSupplier(supplier); setIsSupplierModalOpen(true); }}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">{supplier.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{supplier.contactPerson || "No contact person"}</p>
                  
                  <div className="space-y-2">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Phone size={12} className="text-primary" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Mail size={12} className="text-primary" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <MapPin size={12} className="text-primary mt-0.5" />
                        <span className="line-clamp-2">{supplier.address}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {isPOModalOpen && (
        <POModal
          isOpen={isPOModalOpen}
          onClose={() => setIsPOModalOpen(false)}
          onSave={() => fetchOrders()}
          suppliers={suppliers}
          po={selectedPO}
        />
      )}

      {isSupplierModalOpen && (
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSave={() => fetchSuppliers()}
          supplier={selectedSupplier}
        />
      )}
    </div>
  );
};
