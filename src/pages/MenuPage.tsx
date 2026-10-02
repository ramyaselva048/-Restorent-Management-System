import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { MenuItem, MenuCategory, DietaryType } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  Plus,
  Search,
  Clock,
  Flame,
  Leaf,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X
} from 'lucide-react';

export const MenuPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('18.00');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dietary, setDietary] = useState<DietaryType>('veg');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('15');
  const [calories, setCalories] = useState('450');
  const [spicyLevel, setSpicyLevel] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsData, itemsData] = await Promise.all([
        api.menu.getCategories(),
        api.menu.getItems(),
      ]);
      setCategories(catsData);
      setItems(itemsData);
      if (catsData.length > 0 && !categoryId) {
        setCategoryId(catsData[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updated = await api.menu.toggleAvailability(item.id, !item.isAvailable);
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
      success(
        `"${item.name}" marked ${updated.isAvailable ? 'IN STOCK' : '86 (OUT OF STOCK)'}`
      );
    } catch (err: any) {
      error(err.message || 'Failed to toggle availability');
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    if (categories.length > 0) setCategoryId(categories[0].id);
    setPrice('18.00');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80');
    setDietary('veg');
    setPrepTimeMinutes('15');
    setCalories('450');
    setSpicyLevel('0');
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setPrice(item.price.toString());
    setDescription(item.description);
    setImageUrl(item.imageUrl);
    setDietary(item.dietary);
    setPrepTimeMinutes(item.prepTimeMinutes.toString());
    setCalories(item.calories?.toString() || '450');
    setSpicyLevel(item.spicyLevel?.toString() || '0');
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        categoryId,
        price: Number(price),
        description: description.trim(),
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        dietary,
        prepTimeMinutes: Number(prepTimeMinutes),
        calories: Number(calories) || undefined,
        spicyLevel: Number(spicyLevel) || 0,
      };

      if (editingItem) {
        const updated = await api.menu.updateItem(editingItem.id, payload);
        setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
        success(`Dish "${updated.name}" updated successfully`);
      } else {
        const created = await api.menu.createItem(payload);
        setItems(prev => [created, ...prev]);
        success(`Dish "${created.name}" added to menu catalog`);
      }

      setShowModal(false);
    } catch (err: any) {
      error(err.message || 'Failed to save menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from the menu?`)) return;
    try {
      await api.menu.deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      success(`"${item.name}" deleted from menu`);
    } catch (err: any) {
      error(err.message || 'Failed to delete dish');
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
    if (dietaryFilter !== 'all' && item.dietary !== dietaryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white">Menu & Dish Catalog</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time item pricing, 86 inventory stock toggles, culinary tags, and preparation times.
          </p>
        </div>

        {hasRole(['admin', 'manager']) && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Menu Dish
          </button>
        )}
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          All Items ({items.length})
        </button>
        {categories.map(cat => {
          const count = items.filter(i => i.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search dish title, description or ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder-zinc-500"
          />
        </div>

        <div>
          <select
            value={dietaryFilter}
            onChange={e => setDietaryFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 capitalize"
          >
            <option value="all">All Dietary Preferences</option>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
            <option value="vegan">Vegan Only</option>
          </select>
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading catalog items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-500">
          No menu items match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl bg-zinc-900 border overflow-hidden flex flex-col justify-between transition-all ${
                item.isAvailable ? 'border-zinc-800' : 'border-rose-900/40 opacity-75'
              }`}
            >
              {/* Image & Badges */}
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40" />

                {/* Dietary badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1 ${
                      item.dietary === 'veg'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : item.dietary === 'vegan'
                        ? 'bg-teal-950/80 text-teal-300 border border-teal-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    <Leaf className="w-3 h-3" />
                    {item.dietary}
                  </span>
                </div>

                {/* Stock status badge */}
                <div className="absolute top-2.5 right-2.5">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all shadow-md ${
                      item.isAvailable
                        ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                        : 'bg-rose-600 text-white hover:bg-rose-500'
                    }`}
                    title="Click to toggle stock status"
                  >
                    {item.isAvailable ? 'In Stock' : '86 Out of Stock'}
                  </button>
                </div>

                {/* Price pill */}
                <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/90 border border-zinc-700/80 px-2.5 py-1 rounded-lg text-amber-400 font-mono font-black text-sm">
                  ${item.price.toFixed(2)}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight mb-1">{item.name}</h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    {item.prepTimeMinutes}m
                  </span>
                  {item.calories && <span>{item.calories} kcal</span>}
                  {item.spicyLevel ? (
                    <span className="flex items-center text-rose-400 gap-0.5 font-bold">
                      <Flame className="w-3 h-3" /> Lv.{item.spicyLevel}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              {hasRole(['admin', 'manager']) && (
                <div className="px-4 pb-3 flex items-center justify-end gap-2 border-t border-zinc-800/40 pt-2 bg-zinc-950/40">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Edit dish"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Delete dish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Menu Dish' : 'Create New Menu Dish'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Dish Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Truffle Pappardelle"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Selling Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description & Ingredients
                </label>
                <textarea
                  rows={3}
                  placeholder="Fresh hand-made ribbon pasta with black summer truffles and parmesan..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Dietary
                  </label>
                  <select
                    value={dietary}
                    onChange={e => setDietary(e.target.value as DietaryType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={prepTimeMinutes}
                    onChange={e => setPrepTimeMinutes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Spiciness Level
                  </label>
                  <select
                    value={spicyLevel}
                    onChange={e => setSpicyLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="0">Mild / None</option>
                    <option value="1">Level 1 (Gentle)</option>
                    <option value="2">Level 2 (Medium)</option>
                    <option value="3">Level 3 (Fiery)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
