import { useEffect, useState } from 'react';
import { pushBackHandler } from '../lib/backStack';
import { X, Plus, Minus, Package, Trash2, ChevronDown } from 'lucide-react';

// Common item presets grouped by category
const CATEGORIES = [
  {
    label: '📄 Documents',
    items: [
      { name: 'A4 Documents (50 pages)', kg: 0.25 },
      { name: 'Thick File / Report', kg: 0.5 },
      { name: 'Certificate / ID copies', kg: 0.1 },
      { name: 'Legal papers bundle', kg: 0.8 },
    ],
  },
  {
    label: '📱 Electronics',
    items: [
      { name: 'Smartphone', kg: 0.2 },
      { name: 'Tablet / iPad', kg: 0.5 },
      { name: 'Laptop (13–14")', kg: 1.5 },
      { name: 'Laptop (15–16")', kg: 2.0 },
      { name: 'Charger / Adapter', kg: 0.25 },
      { name: 'Power bank', kg: 0.35 },
      { name: 'Earphones / Headphones', kg: 0.3 },
      { name: 'Smart watch', kg: 0.1 },
    ],
  },
  {
    label: '👕 Clothes',
    items: [
      { name: 'T-shirt / Kurti', kg: 0.2 },
      { name: 'Jeans / Trousers', kg: 0.5 },
      { name: 'Saree', kg: 0.6 },
      { name: 'Jacket / Hoodie', kg: 0.8 },
      { name: 'Winter coat', kg: 1.2 },
      { name: 'Shoes / Sandals (pair)', kg: 0.8 },
    ],
  },
  {
    label: '📚 Books',
    items: [
      { name: 'Thin paperback', kg: 0.2 },
      { name: 'Novel / Book', kg: 0.4 },
      { name: 'Textbook / Thick book', kg: 0.8 },
      { name: 'Set of 5 books', kg: 2.5 },
    ],
  },
  {
    label: '🍱 Food & Home',
    items: [
      { name: 'Tiffin box (full)', kg: 1.0 },
      { name: 'Small gift box', kg: 0.5 },
      { name: 'Medium box of sweets', kg: 1.5 },
      { name: 'Spices / Masala pack', kg: 0.5 },
      { name: 'Bottle of oil / ghee', kg: 1.0 },
    ],
  },
  {
    label: '💊 Medicine & Personal',
    items: [
      { name: 'Medicine strips / tablets', kg: 0.2 },
      { name: 'Syrup bottle', kg: 0.4 },
      { name: 'Cosmetics / Skincare set', kg: 0.5 },
      { name: 'Jewellery box', kg: 0.3 },
    ],
  },
];

export default function WeightCalculator({ onApply, onClose }) {
  const [added,        setAdded]        = useState([]); // { name, kg, qty }[]
  const [openCat,      setOpenCat]      = useState(0);
  const [customName,   setCustomName]   = useState('');
  const [customKg,     setCustomKg]     = useState('');
  const [boxL,         setBoxL]         = useState('');
  const [boxW,         setBoxW]         = useState('');
  const [boxH,         setBoxH]         = useState('');
  const [showBox,      setShowBox]      = useState(false);

  const totalKg = added.reduce((sum, item) => sum + item.kg * item.qty, 0);

  const addItem = (item) => {
    setAdded(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) return prev.map(i => i.name === item.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (name) => setAdded(prev => prev.filter(i => i.name !== name));

  const changeQty = (name, delta) => {
    setAdded(prev => prev.map(i => {
      if (i.name !== name) return i;
      const q = i.qty + delta;
      return q <= 0 ? null : { ...i, qty: q };
    }).filter(Boolean));
  };

  const addCustom = () => {
    const kg = parseFloat(customKg);
    if (!customName.trim() || !kg || kg <= 0) return;
    addItem({ name: customName.trim(), kg });
    setCustomName(''); setCustomKg('');
  };

  const addVolumetric = () => {
    const l = parseFloat(boxL), w = parseFloat(boxW), h = parseFloat(boxH);
    if (!l || !w || !h) return;
    const vol = parseFloat(((l * w * h) / 5000).toFixed(2));
    addItem({ name: `Box (${l}×${w}×${h} cm)`, kg: Math.max(vol, 0.1) });
    setBoxL(''); setBoxW(''); setBoxH(''); setShowBox(false);
  };

  // Android back closes the calculator (not the form underneath)
  useEffect(() => pushBackHandler(() => onClose?.()), [onClose]);

  const handleApply = () => {
    const rounded = Math.max(0.1, parseFloat(totalKg.toFixed(2)));
    onApply(rounded);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease both' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-200 shrink-0 font-inter">
          <div>
            <h2 className="text-[17px] font-semibold text-slate-900">Estimate weight</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Add the items you're sending to get a rough total</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-100 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Running total — sticky */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-orange-100 font-semibold uppercase tracking-wide">Total Weight</p>
              <p className="text-2xl font-black text-white">{totalKg.toFixed(2)} kg</p>
            </div>
            <button
              onClick={handleApply}
              disabled={totalKg === 0}
              className="bg-white text-orange-600 font-black text-sm px-5 py-2.5 rounded-2xl active:scale-95 transition-all disabled:opacity-40 shadow-lg">
              Use {totalKg > 0 ? `${totalKg.toFixed(2)}kg` : 'this'}
            </button>
          </div>

          {/* Added items */}
          {added.length > 0 && (
            <div className="px-4 py-3 space-y-2 border-b border-stone-100">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Added Items</p>
              {added.map(item => (
                <div key={item.name} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400">{item.kg}kg × {item.qty} = <strong className="text-orange-600">{(item.kg * item.qty).toFixed(2)}kg</strong></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => changeQty(item.name, -1)}
                      className="w-6 h-6 bg-white rounded-lg border border-stone-200 flex items-center justify-center active:scale-90">
                      <Minus size={10} className="text-stone-500" />
                    </button>
                    <span className="text-xs font-bold text-stone-700 w-4 text-center">{item.qty}</span>
                    <button onClick={() => changeQty(item.name, 1)}
                      className="w-6 h-6 bg-white rounded-lg border border-stone-200 flex items-center justify-center active:scale-90">
                      <Plus size={10} className="text-stone-500" />
                    </button>
                    <button onClick={() => removeItem(item.name)}
                      className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center active:scale-90 ml-1">
                      <Trash2 size={10} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Volumetric weight (box dimensions) */}
          <div className="px-4 py-3 border-b border-stone-100">
            <button onClick={() => setShowBox(v => !v)}
              className="flex items-center gap-2 text-xs font-bold text-stone-600 w-full">
              <Package size={13} className="text-stone-400" />
              Calculate from box dimensions (L × W × H)
              <ChevronDown size={13} className={`ml-auto text-stone-400 transition-transform ${showBox ? 'rotate-180' : ''}`} />
            </button>
            {showBox && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="grid grid-cols-3 gap-2">
                  {[['L', boxL, setBoxL], ['W', boxW, setBoxW], ['H', boxH, setBoxH]].map(([label, val, set]) => (
                    <div key={label}>
                      <label className="text-[10px] text-stone-400 font-semibold">{label} (cm)</label>
                      <input type="number" className="input-field mt-0.5 text-sm" placeholder="0"
                        value={val} onChange={e => set(e.target.value)} inputMode="decimal" />
                    </div>
                  ))}
                </div>
                {boxL && boxW && boxH && (
                  <p className="text-[11px] text-stone-500">
                    Volumetric weight: <strong className="text-orange-600">
                      {Math.max((parseFloat(boxL) * parseFloat(boxW) * parseFloat(boxH) / 5000), 0.1).toFixed(2)} kg
                    </strong>
                  </p>
                )}
                <button onClick={addVolumetric} disabled={!boxL || !boxW || !boxH}
                  className="w-full btn-primary py-2 text-sm disabled:opacity-40">
                  + Add box
                </button>
              </div>
            )}
          </div>

          {/* Custom item */}
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-2">Custom Item</p>
            <div className="flex gap-2">
              <input className="input-field flex-1 text-sm" placeholder="Item name" value={customName}
                onChange={e => setCustomName(e.target.value)} />
              <input type="number" className="input-field w-24 text-sm" placeholder="kg"
                value={customKg} onChange={e => setCustomKg(e.target.value)} inputMode="decimal" />
              <button onClick={addCustom} disabled={!customName.trim() || !customKg}
                className="w-10 h-10 shrink-0 bg-orange-500 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Category presets */}
          <div className="px-4 py-3 pb-6">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-3">Common Items</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat, ci) => (
                <div key={cat.label} className="border border-stone-100 rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenCat(openCat === ci ? -1 : ci)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 active:bg-stone-100 transition-colors">
                    <span className="text-sm font-bold text-stone-800">{cat.label}</span>
                    <ChevronDown size={14} className={`text-stone-400 transition-transform ${openCat === ci ? 'rotate-180' : ''}`} />
                  </button>
                  {openCat === ci && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 animate-fade-in">
                      {cat.items.map(item => {
                        const inList = added.find(a => a.name === item.name);
                        return (
                          <button key={item.name} onClick={() => addItem(item)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.97] border ${
                              inList
                                ? 'bg-orange-50 border-orange-200'
                                : 'bg-white border-stone-100 hover:border-orange-200 hover:bg-orange-50'
                            }`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-stone-800 leading-tight line-clamp-2">{item.name}</p>
                              <p className="text-[10px] text-stone-400 mt-0.5">{item.kg} kg</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                              inList ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-400'
                            }`}>
                              {inList ? inList.qty : '+'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
