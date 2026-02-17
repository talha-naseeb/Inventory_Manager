import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Package } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ProductModal } from "../components/inventory/ProductModal";
import { BrandSidebar } from "../components/inventory/BrandSidebar";
import { BrandModal } from "../components/inventory/BrandModal";
import { dbService } from "../services/database";
import type { Product } from "../types";

interface Brand {
  id: string;
  name: string;
  productCount?: number;
}

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrands = async () => {
    try {
      const brandsData = await dbService.query<Brand>(`
        SELECT 
          b.id, 
          b.name,
          COUNT(p.id) as productCount
        FROM brands b
        LEFT JOIN products p ON b.id = p.brand_id
        GROUP BY b.id, b.name
        ORDER BY b.name
      `);
      setBrands(brandsData);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      let query = `
        SELECT p.*, b.name as brand
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (selectedBrandId) {
        query += " AND p.brand_id = ?";
        params.push(selectedBrandId);
      }

      if (search) {
        query += " AND (p.name LIKE ? OR p.sku LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }

      query += " ORDER BY p.created_at DESC";

      const data = await dbService.query(query, params);
      setProducts(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          brandId: p.brand_id,
          price: p.price,
          wholesalePrice: p.wholesale_price,
          costPrice: p.cost_price,
          stock: p.stock,
          image: p.image,
          description: p.description,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchInventory();
  }, [selectedBrandId, search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await dbService.execute("DELETE FROM products WHERE id = ?", [id]);
      await dbService.enqueueSync("DELETE_PRODUCT", id, { id, deletedAt: new Date().toISOString() });
      fetchInventory();
      fetchBrands(); // Refresh counts
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product. Please try again.");
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleProductSave = () => {
    fetchInventory();
    fetchBrands(); // Refresh counts
  };

  const handleBrandSave = () => {
    fetchBrands();
  };

  const handleDeleteAllProducts = async () => {
    if (products.length === 0) {
      alert("No products to delete.");
      return;
    }

    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL ${products.length} product(s)!\n\nThis action cannot be undone.\n\nAre you absolutely sure?`;

    if (!confirm(confirmMessage)) return;

    // Double confirmation for safety
    if (!confirm("Last chance! Delete all products?")) return;

    try {
      // First, delete all order_items to avoid foreign key constraint
      await dbService.execute("DELETE FROM order_items");

      // Then delete all products
      await dbService.execute("DELETE FROM products");

      await dbService.enqueueSync("DELETE_ALL_PRODUCTS", "bulk", {
        deletedAt: new Date().toISOString(),
        count: products.length,
      });

      fetchInventory();
      fetchBrands(); // Refresh counts
      alert(`Successfully deleted ${products.length} product(s) and cleared order history.`);
    } catch (error) {
      console.error("Failed to delete all products:", error);
      alert("Failed to delete products. Please try again.");
    }
  };

  const totalProducts = products.length;
  const filteredProducts = products;

  return (
    <div className='h-screen flex flex-col bg-slate-50 dark:bg-dark-bg'>
      {/* Header */}
      <div className='bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>Inventory Management</h1>
            <p className='text-slate-600 dark:text-slate-400 mt-1'>
              {selectedBrandId ? brands.find((b) => b.id === selectedBrandId)?.name : "All Brands"} • {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>
          <div className='flex gap-2'>
            {products.length > 0 && (
              <Button variant='outline' onClick={handleDeleteAllProducts} className='text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'>
                <Trash2 size={18} className='mr-2' />
                Delete All Products
              </Button>
            )}
            <Button onClick={handleAddProduct}>
              <Plus size={18} className='mr-2' />
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Left Sidebar - Brands */}
        <div className='w-64 flex-shrink-0'>
          <BrandSidebar
            brands={brands}
            selectedBrandId={selectedBrandId}
            onSelectBrand={setSelectedBrandId}
            onAddBrand={() => setIsBrandModalOpen(true)}
            onBrandDeleted={() => {
              fetchBrands();
              fetchInventory();
            }}
            totalProducts={totalProducts}
          />
        </div>

        {/* Right Panel - Products */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          {/* Search Bar */}
          <div className='p-4 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={20} />
              <Input type='text' placeholder='Search products by name or SKU...' value={search} onChange={(e) => setSearch(e.target.value)} className='pl-10' />
            </div>
          </div>

          {/* Products Grid */}
          <div className='flex-1 overflow-y-auto p-6'>
            {loading ? (
              <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
                <p className='text-slate-600 dark:text-slate-400 mt-4'>Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className='text-center py-12'>
                <Package size={48} className='mx-auto text-slate-300 dark:text-slate-600 mb-4' />
                <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>No products found</h3>
                <p className='text-slate-600 dark:text-slate-400 mb-4'>{search ? "Try adjusting your search" : "Get started by adding your first product"}</p>
                {!search && (
                  <Button onClick={handleAddProduct}>
                    <Plus size={18} className='mr-2' />
                    Add Product
                  </Button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {filteredProducts.map((product) => (
                  <Card key={product.id} className='overflow-hidden hover:shadow-lg transition-shadow'>
                    {/* Product Image */}
                    <div className='aspect-square bg-slate-100 dark:bg-slate-800 relative'>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className='w-full h-full object-cover'
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <Package size={48} className='text-slate-300 dark:text-slate-600' />
                        </div>
                      )}
                      {product.brand && <div className='absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-medium'>{product.brand}</div>}
                      {product.stock <= 5 && <div className='absolute top-2 right-2 bg-rose-500 text-white text-xs px-2 py-1 rounded-full font-medium'>Low Stock</div>}
                    </div>

                    {/* Product Details */}
                    <div className='p-4'>
                      <h3 className='font-semibold text-slate-900 dark:text-white mb-1 truncate'>{product.name}</h3>
                      <p className='text-sm text-slate-600 dark:text-slate-400 mb-2'>SKU: {product.sku}</p>
                      <div className='flex items-center justify-between mb-3'>
                        <div>
                          <p className='text-lg font-bold text-primary'>PKR {product.price.toFixed(2)}</p>
                          <p className='text-xs text-slate-500'>Stock: {product.stock}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex gap-2'>
                        <Button variant='outline' size='sm' onClick={() => handleEdit(product)} className='flex-1'>
                          <Edit2 size={14} className='mr-1' />
                          Edit
                        </Button>
                        <Button variant='outline' size='sm' onClick={() => handleDelete(product.id)} className='text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleProductSave}
        product={selectedProduct}
        selectedBrandId={selectedBrandId}
      />

      <BrandModal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} onSave={handleBrandSave} />
    </div>
  );
};
