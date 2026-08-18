import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Cloud, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff, Zap, Database } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { cn } from "../../lib/utils";

const SUPABASE_SQL = `-- Inventory Manager POS Supabase setup
-- Use only a publishable/anon key in the desktop app. Service-role keys must never be used.
-- Multi-store pilot model: users sign in with Supabase Auth, then RLS checks public.store_members.

create table if not exists stores (
  id text primary key,
  name text not null,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists store_members (
  store_id text not null references stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'staff',
  created_at timestamptz default now(),
  primary key (store_id, user_id)
);

create table if not exists brands (
  id text primary key,
  store_id text default 'default',
  name text not null,
  description text,
  logo text,
  created_at timestamptz default now()
);

create table if not exists products (
  id text primary key,
  store_id text default 'default',
  name text not null,
  description text,
  sku text,
  brand_id text,
  price real default 0,
  wholesale_price real default 0,
  cost_price real default 0,
  image text,
  stock real default 0,
  unit text default 'item',
  meters_per_unit real default 1.0,
  created_at timestamptz default now()
);

create table if not exists customers (
  id text primary key,
  store_id text default 'default',
  name text not null,
  phone text,
  email text,
  address text,
  store_credit_balance real default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id text primary key,
  store_id text default 'default',
  customer_id text,
  customer_name text,
  subtotal real default 0,
  discount real default 0,
  tax real default 0,
  total real default 0,
  payment_method text,
  store_credit_used real default 0,
  status text default 'completed',
  staff_id text,
  original_order_id text,
  returned_items_json text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id text primary key,
  store_id text default 'default',
  order_id text,
  product_id text,
  name text not null,
  price real not null,
  quantity real not null,
  total real not null,
  price_type text default 'retail',
  unit text,
  created_at timestamptz default now()
);

create table if not exists returns (
  id text primary key,
  store_id text default 'default',
  order_id text not null,
  replacement_order_id text,
  return_value real default 0,
  items_json text,
  status text default 'completed',
  balance_outcome text default 'none',
  amount_due real default 0,
  remaining_balance real default 0,
  created_at timestamptz default now()
);

create table if not exists rolls (
  id text primary key,
  store_id text default 'default',
  product_id text not null,
  roll_number text,
  initial_length real default 0,
  current_length real default 0,
  unit text default 'meter',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory_logs (
  id text primary key,
  store_id text default 'default',
  product_id text not null,
  action_type text not null,
  quantity real not null,
  previous_stock real,
  current_stock real,
  reason text,
  staff_id text,
  created_at timestamptz default now()
);

create table if not exists customer_credit_logs (
  id text primary key,
  store_id text default 'default',
  customer_id text not null,
  source_type text not null,
  source_id text,
  order_id text,
  amount real not null,
  balance_after real not null,
  note text,
  created_at timestamptz default now()
);

create or replace function public.user_has_store_access(target_store_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
  );
$$;

alter table stores enable row level security;
alter table store_members enable row level security;
alter table products enable row level security;
alter table brands enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table returns enable row level security;
alter table rolls enable row level security;
alter table inventory_logs enable row level security;
alter table customer_credit_logs enable row level security;

create index if not exists store_members_user_id_idx on store_members (user_id);
create index if not exists store_members_store_id_idx on store_members (store_id);
create index if not exists products_store_id_idx on products (store_id);
create index if not exists brands_store_id_idx on brands (store_id);
create index if not exists customers_store_id_idx on customers (store_id);
create index if not exists orders_store_id_idx on orders (store_id);
create index if not exists order_items_store_id_idx on order_items (store_id);
create index if not exists returns_store_id_idx on returns (store_id);
create index if not exists rolls_store_id_idx on rolls (store_id);
create index if not exists inventory_logs_store_id_idx on inventory_logs (store_id);
create index if not exists customer_credit_logs_store_id_idx on customer_credit_logs (store_id);

drop policy if exists "stores_member_select" on stores;
create policy "stores_member_select" on stores for select to authenticated using (public.user_has_store_access(id));
drop policy if exists "store_members_self_select" on store_members;
create policy "store_members_self_select" on store_members for select to authenticated using (user_id = auth.uid());

drop policy if exists "products_store_access" on products;
create policy "products_store_access" on products for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "brands_store_access" on brands;
create policy "brands_store_access" on brands for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "customers_store_access" on customers;
create policy "customers_store_access" on customers for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "orders_store_access" on orders;
create policy "orders_store_access" on orders for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "order_items_store_access" on order_items;
create policy "order_items_store_access" on order_items for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "returns_store_access" on returns;
create policy "returns_store_access" on returns for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "rolls_store_access" on rolls;
create policy "rolls_store_access" on rolls for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "inventory_logs_store_access" on inventory_logs;
create policy "inventory_logs_store_access" on inventory_logs for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));
drop policy if exists "customer_credit_logs_store_access" on customer_credit_logs;
create policy "customer_credit_logs_store_access" on customer_credit_logs for all to authenticated using (public.user_has_store_access(store_id)) with check (public.user_has_store_access(store_id));

-- After creating Auth users, insert one row per pilot store and member:
-- insert into stores (id, name) values ('store-a', 'Downtown Branch');
-- insert into store_members (store_id, user_id, role) values ('store-a', '<auth-user-uuid>', 'owner');`;

export const CloudSyncSettings: React.FC = () => {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [activationStoreId, setActivationStoreId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.sync?.getSettings) {
        const settings = await window.electronAPI.sync.getSettings();
        setSupabaseUrl(settings.url || "");
        setIsConfigured(settings.isConfigured || false);
        setIsActivated(settings.isActivated || false);
        setIsAuthenticated(settings.isAuthenticated || false);
        setActivationStoreId(settings.storeId || "");
        setStoreName(settings.storeName || "");
        setUserEmail(settings.userEmail || "");
        setPendingCount(settings.pendingCount || 0);
      }
    } catch (err) {
      console.error("Failed to load sync settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const showMsg = (type: "success" | "error" | "info", text: string, duration = 4000) => {
    setMsg({ type, text });
    if (duration > 0) setTimeout(() => setMsg(null), duration);
  };

  const handleSave = async () => {
    if (!supabaseUrl.trim()) return showMsg("error", "Supabase URL is required.");
    if (!isConfigured && !supabaseKey.trim()) return showMsg("error", "Supabase publishable/anon key is required.");
    if (!supabaseUrl.startsWith("https://")) return showMsg("error", "URL must start with https://");

    setSaving(true);
    setMsg(null);
    try {
      const result = await window.electronAPI.invoke("sync:saveSettings", {
        url: supabaseUrl.trim(),
        key: supabaseKey.trim(),
      });
      if (result?.success) {
        setIsConfigured(true);
        setSupabaseKey("");
        await loadSettings();
        showMsg("success", "Supabase connected! Settings saved.");
      } else {
        showMsg("error", result?.error || "Failed to save settings.");
      }
    } catch (err: any) {
      showMsg("error", err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!supabaseUrl.trim()) return showMsg("error", "Supabase URL is required before activation.");
    if (!isConfigured && !supabaseKey.trim()) return showMsg("error", "Save a publishable/anon key before activation.");
    if (!cloudEmail.trim()) return showMsg("error", "Cloud email is required.");
    if (!cloudPassword) return showMsg("error", "Cloud password is required.");
    if (!activationStoreId.trim()) return showMsg("error", "Pilot store ID is required.");

    setActivating(true);
    setMsg(null);
    try {
      const result = await window.electronAPI.cloud.signIn({
        url: supabaseUrl.trim(),
        key: supabaseKey.trim(),
        email: cloudEmail.trim(),
        password: cloudPassword,
        storeId: activationStoreId.trim(),
      });
      if (result?.success) {
        setCloudPassword("");
        setIsActivated(true);
        setIsAuthenticated(true);
        setActivationStoreId(result.storeId || activationStoreId.trim());
        setStoreName(result.storeName || "");
        setUserEmail(result.userEmail || cloudEmail.trim());
        setIsConfigured(true);
        setSupabaseKey("");
        await loadSettings();
        showMsg("success", `Activated ${result.storeName || result.storeId || "store"} for cloud sync.`);
      } else {
        showMsg("error", result?.error || "Store activation failed.");
      }
    } catch (err: any) {
      showMsg("error", err.message || "Store activation failed.");
    } finally {
      setActivating(false);
    }
  };

  const handleSignOut = async () => {
    setActivating(true);
    setMsg(null);
    try {
      const result = await window.electronAPI.cloud.signOut();
      if (result?.success) {
        setIsAuthenticated(false);
        setUserEmail("");
        await loadSettings();
        showMsg("success", "Cloud session signed out. Local POS remains available.");
      } else {
        showMsg("error", result?.error || "Cloud sign-out failed.");
      }
    } catch (err: any) {
      showMsg("error", err.message || "Cloud sign-out failed.");
    } finally {
      setActivating(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const result = await window.electronAPI.invoke("sync:testConnection");
      if (result?.success) {
        showMsg("success", "Connection successful! Supabase is reachable.");
      } else {
        showMsg("error", `Connection failed: ${result?.error || "Unknown error"}`);
      }
    } catch (err: any) {
      showMsg("error", err.message || "Test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMsg(null);
    try {
      await window.electronAPI.sync.trigger();
      setTimeout(async () => {
        const settings = await window.electronAPI.sync.getSettings();
        setPendingCount(settings.pendingCount || 0);
        showMsg("success", "Sync triggered. Check pending count.");
        setSyncing(false);
      }, 2000);
    } catch (err: any) {
      showMsg("error", err.message || "Sync failed.");
      setSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", isConfigured ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800")}>
              <Cloud size={20} className={isConfigured ? "text-emerald-600" : "text-slate-400"} />
            </div>
            <div className="flex-1">
              <CardTitle>Supabase Cloud Sync</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Real-time sync of all sales, inventory, and customers to Supabase</p>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", isActivated && isAuthenticated ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500")}>
              {isActivated && isAuthenticated ? <><CheckCircle size={12} /> Activated</> : "Not Activated"}
            </span>
          </div>
        </CardHeader>
        {isConfigured && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs text-slate-500 font-medium">Pending Sync Items</p>
                <p className={cn("text-2xl font-black mt-1", pendingCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                  {pendingCount}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{pendingCount === 0 ? "All synced" : "waiting to sync"}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between">
                <p className="text-xs text-slate-500 font-medium">Activated Store</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("w-2 h-2 rounded-full", isAuthenticated ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {storeName || activationStoreId || "Activation required"}
                  </span>
                </div>
                {userEmail && <p className="text-xs text-slate-400 mt-1 truncate">{userEmail}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleTest} disabled={testing}>
                {testing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                Test Connection
              </Button>
              <Button size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
                {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Sync Now
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut} disabled={activating || !isAuthenticated}>
                Sign Out Cloud
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{isConfigured ? "Update Connection" : "Connect to Supabase"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Supabase Project URL</label>
            <Input
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isConfigured ? "New publishable/anon key (leave blank to keep current)" : "Supabase publishable/anon key"}
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder={isConfigured ? "Enter new key to update" : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 px-1">Use a scoped publishable/anon key with Row Level Security policies. Service-role keys must never be used in this desktop app.</p>
          </div>

          {msg && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
                msg.type === "success" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
                msg.type === "error" && "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30",
                msg.type === "info" && "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
              )}
            >
              {msg.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {msg.text}
            </motion.div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><RefreshCw size={16} className="animate-spin mr-2" /> Saving...</> : isConfigured ? "Update Connection" : "Connect to Supabase"}
          </Button>
        </CardContent>
      </Card>

      {/* Store Activation */}
      <Card>
        <CardHeader>
          <CardTitle>Activate Store</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">Sign in with a Supabase Auth user that belongs to this pilot store.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pilot Store ID</label>
            <Input
              value={activationStoreId}
              onChange={(e) => setActivationStoreId(e.target.value)}
              placeholder="store-a"
            />
            <p className="text-[11px] text-slate-400 mt-1 px-1">Must match a row in the Supabase <code>stores</code> table and the signed-in user's <code>store_members</code> row.</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cloud Email</label>
            <Input
              type="email"
              value={cloudEmail}
              onChange={(e) => setCloudEmail(e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cloud Password</label>
            <Input
              type="password"
              value={cloudPassword}
              onChange={(e) => setCloudPassword(e.target.value)}
              placeholder="Supabase Auth password"
            />
          </div>
          <Button onClick={handleActivate} disabled={activating} className="w-full">
            {activating ? <><RefreshCw size={16} className="animate-spin mr-2" /> Activating...</> : "Activate Store"}
          </Button>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                <Database size={20} className="text-blue-600" />
              </div>
              <div>
                <CardTitle>Supabase Table Setup</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Create the required tables in your Supabase project</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSql(!showSql)}>
              {showSql ? "Hide SQL" : "Show SQL"}
            </Button>
          </div>
        </CardHeader>
        {showSql && (
          <CardContent className="space-y-3">
            <ol className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
              <li>Go to your Supabase project dashboard</li>
              <li>Open the <strong>SQL Editor</strong></li>
              <li>Paste and run the SQL below</li>
              <li>Come back here and configure your URL + API key</li>
            </ol>
            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 text-xs p-4 rounded-xl overflow-auto max-h-60 font-mono leading-relaxed">
                {SUPABASE_SQL}
              </pre>
              <div className="absolute top-3 right-3 flex gap-2">
                <Button size="sm" variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" onClick={handleCopySql}>
                  {copiedSql ? "Copied!" : "Copy SQL"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              For production, also configure Row Level Security (RLS) policies to restrict access by store_id.
            </p>
          </CardContent>
        )}
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>How Sync Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { icon: "1", title: "Offline-first", desc: "All operations save to local SQLite first — the app works 100% without internet." },
              { icon: "2", title: "Queue-based sync", desc: "Every create/update/delete adds a record to the sync_queue table." },
              { icon: "3", title: "Auto-sync", desc: "Every 30 seconds, pending items are pushed to Supabase via upsert." },
              { icon: "4", title: "Retry logic", desc: "Failed items are retried up to 10 times before being marked as permanently failed." },
            ].map((item) => (
              <div key={item.icon} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
