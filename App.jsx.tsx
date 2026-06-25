import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const COLORS = ["#00C49F", "#0088FE", "#FF6B35"];
const now = new Date();
const DEFAULT_MONTH = now.getMonth();
const DEFAULT_YEAR = now.getFullYear();

const BOUTIQUES_KEY = "replayce:boutiques";
const DEFAULT_BOUTIQUES = [
  { id: "beaune", name: "Beaune" },
  { id: "albi", name: "Albi" },
  { id: "bruz", name: "Bruz" },
  { id: "cannes", name: "Cannes" },
  { id: "chateauroux", name: "Châteauroux" },
  { id: "dijon", name: "Dijon" },
  { id: "draguignan", name: "Draguignan" },
  { id: "hazebrouck", name: "Hazebrouck" },
  { id: "lagny-sur-marne", name: "Lagny-sur-Marne" },
  { id: "limoges", name: "Limoges" },
  { id: "merignac", name: "Mérignac" },
  { id: "montpellier", name: "Montpellier" },
  { id: "pau", name: "Pau" },
  { id: "saint-die-des-vosges", name: "Saint-Dié-des-Vosges" },
  { id: "tours", name: "Tours" },
  { id: "palaiseau", name: "Palaiseau" },
  { id: "rennes-saint-martin", name: "Rennes (Saint-Martin)" },
  { id: "rennes-janze", name: "Rennes (Janzé)" },
  { id: "bruges", name: "Bruges" },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
const storageKey = (id, month, year) => `replayce:${id}:${year}-${month}`;
async function loadBoutiques() {
  try { const r = await window.storage.get(BOUTIQUES_KEY, true); return r ? JSON.parse(r.value) : DEFAULT_BOUTIQUES; }
  catch { return DEFAULT_BOUTIQUES; }
}
async function saveBoutiques(list) {
  try { await window.storage.set(BOUTIQUES_KEY, JSON.stringify(list), true); return true; } catch { return false; }
}
async function saveReport(boutiqueId, month, year, data) {
  try { await window.storage.set(storageKey(boutiqueId, month, year), JSON.stringify({ ...data, boutiqueId, month, year, submittedAt: new Date().toISOString() }), true); return true; } catch { return false; }
}
async function loadReport(boutiqueId, month, year) {
  try { const r = await window.storage.get(storageKey(boutiqueId, month, year), true); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function loadAllReports(boutiques, month, year) {
  const reports = [];
  for (const b of boutiques) { const r = await loadReport(b.id, month, year); if (r) reports.push({ ...r, boutiqueName: b.name }); }
  return reports;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat("fr-FR").format(n || 0);
const slugify = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function prevPeriod(month, year) {
  return month === 0 ? { month: 11, year: year - 1 } : { month: month - 1, year };
}
function prevYear(month, year) {
  return { month, year: year - 1 };
}
function calcEvol(current, previous) {
  if (!previous || parseFloat(previous) === 0) return null;
  return ((parseFloat(current) - parseFloat(previous)) / parseFloat(previous)) * 100;
}

// ─── Composant flèche évolution ───────────────────────────────────────────────
function Evol({ pct, label }) {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  const color = up ? "#4dbb7a" : "#ff4d6d";
  const arrow = up ? "▲" : "▼";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 6 }}>
      {arrow} {Math.abs(pct).toFixed(1)}%
      {label && <span style={{ fontWeight: 400, color: "#888", marginLeft: 2 }}>{label}</span>}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelStyle = { display: "block", fontSize: 11, color: "#8888aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 };
const selectStyle = { width: "100%", background: "#12121e", border: "1px solid #2a2a3e", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none" };
const inputBase = { width: "100%", background: "#12121e", border: "1px solid #2a2a3e", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" };

// ─── Sous-composants ──────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#FF6B35", fontWeight: 700, marginBottom: 12 }}>{children}</div>;
}
function InputField({ label, value, onChange, placeholder, accent, type = "number" }) {
  return (
    <div>
      <label style={{ ...labelStyle, color: accent || "#8888aa" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputBase, border: `1px solid ${accent ? accent + "44" : "#2a2a3e"}` }} />
    </div>
  );
}
function AlertBox({ color, children }) {
  return <div style={{ background: color + "22", border: `1px solid ${color}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color }}>{children}</div>;
}
function Header({ title, sub, action }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderBottom: "1px solid #2a2a3e", padding: "28px 32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #FF6B35, #f7c948)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff" }}>R</div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#FF6B35", textTransform: "uppercase", fontWeight: 600 }}>REPLAYCE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{title}</div>
          </div>
        </div>
        {action}
      </div>
      {sub && <div style={{ fontSize: 13, color: "#8888aa", marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

// KpiCard avec évolution
function KpiCard({ label, value, sub, color, evolMois, evolAn }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 14, padding: "18px 16px", border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, color: "#8888aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 6 }}>{value}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {evolMois !== undefined && <div style={{ fontSize: 11, color: "#666" }}>vs mois préc. <Evol pct={evolMois} /></div>}
        {evolAn !== undefined && <div style={{ fontSize: 11, color: "#666" }}>vs année préc. <Evol pct={evolAn} /></div>}
        {evolMois === undefined && evolAn === undefined && <div style={{ fontSize: 11, color: "#8888aa" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ boutiques, onUpdate, onBack }) {
  const [list, setList] = useState(boutiques);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const addBoutique = () => {
    const name = newName.trim(); if (!name) return;
    const base = slugify(name); let id = base; let i = 1;
    while (list.find(b => b.id === id)) { id = `${base}-${i++}`; }
    setList(l => [...l, { id, name }]); setNewName(""); setSaved(false);
  };
  const removeBoutique = (id) => { setList(l => l.filter(b => b.id !== id)); setDeleteConfirm(null); setSaved(false); };
  const renameBoutique = (id, n) => { setList(l => l.map(b => b.id === id ? { ...b, name: n } : b)); setSaved(false); };
  const handleSave = async () => { setSaving(true); const ok = await saveBoutiques(list); if (ok) { onUpdate(list); setSaved(true); } setSaving(false); };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f14", color: "#f0f0f0", fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <Header title="Gestion des boutiques" sub="Ajoutez, renommez ou supprimez des boutiques du réseau" />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "32px 20px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "1px solid #2a2a3e", borderRadius: 8, color: "#8888aa", padding: "8px 16px", fontSize: 13, cursor: "pointer", marginBottom: 28 }}>← Retour</button>
        <SectionTitle>Ajouter une boutique</SectionTitle>
        <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addBoutique()} placeholder="Ex : Lille Grand Place" style={{ ...inputBase, flex: 1 }} />
          <button onClick={addBoutique} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #FF6B35, #f7b235)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>+ Ajouter</button>
        </div>
        <SectionTitle>Boutiques du réseau ({list.length})</SectionTitle>
        <div style={{ background: "#1a1a2e", borderRadius: 14, border: "1px solid #2a2a3e", overflow: "hidden", marginBottom: 28 }}>
          {list.map((b, i) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: i < list.length - 1 ? "1px solid #2a2a3e" : "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF6B35", flexShrink: 0 }}></span>
              <input type="text" value={b.name} onChange={e => renameBoutique(b.id, e.target.value)} style={{ flex: 1, background: "transparent", border: "none", color: "#f0f0f0", fontSize: 14, outline: "none", padding: "2px 0" }} />
              <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace", flexShrink: 0 }}>{b.id}</span>
              {deleteConfirm === b.id ? (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => removeBoutique(b.id)} style={{ background: "#ff4d6d22", border: "1px solid #ff4d6d", borderRadius: 6, color: "#ff4d6d", padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Confirmer</button>
                  <button onClick={() => setDeleteConfirm(null)} style={{ background: "none", border: "1px solid #2a2a3e", borderRadius: 6, color: "#8888aa", padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(b.id)} style={{ background: "none", border: "none", color: "#555", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
        {saved && <AlertBox color="#4dbb7a">✓ Liste sauvegardée avec succès.</AlertBox>}
        <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: 14, background: saved ? "#1a3a2a" : "linear-gradient(135deg, #FF6B35, #f7b235)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Sauvegarder les modifications"}
        </button>
      </div>
    </div>
  );
}

// ─── Formulaire Boutique ──────────────────────────────────────────────────────
function BoutiqueForm({ boutique }) {
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [form, setForm] = useState({ ca: "", tickets: "", stock: "", accessoires: "", smartphones: "", reparations: "", hydrogel: "" });
  const [status, setStatus] = useState("idle");
  const [existing, setExisting] = useState(null);
  const [prevM, setPrevM] = useState(null);
  const [prevY, setPrevY] = useState(null);
  const years = [DEFAULT_YEAR - 1, DEFAULT_YEAR];

  useEffect(() => {
    (async () => {
      const r = await loadReport(boutique.id, month, year);
      setExisting(r);
      if (r) setForm({ ca: r.ca, tickets: r.tickets, stock: r.stock, accessoires: r.accessoires, smartphones: r.smartphones, reparations: r.reparations, hydrogel: r.hydrogel });
      else setForm({ ca: "", tickets: "", stock: "", accessoires: "", smartphones: "", reparations: "", hydrogel: "" });
      const pm = prevPeriod(month, year);
      const py = prevYear(month, year);
      const [rPm, rPy] = await Promise.all([loadReport(boutique.id, pm.month, pm.year), loadReport(boutique.id, py.month, py.year)]);
      setPrevM(rPm); setPrevY(rPy);
      setStatus("idle");
    })();
  }, [month, year]);

  const totalPct = () => (parseFloat(form.accessoires) || 0) + (parseFloat(form.smartphones) || 0) + (parseFloat(form.reparations) || 0);
  const handleSubmit = async () => {
    const required = ["ca", "tickets", "stock", "accessoires", "smartphones", "reparations", "hydrogel"];
    for (const k of required) { if (form[k] === "" || isNaN(parseFloat(form[k]))) { setStatus("error"); return; } }
    if (Math.abs(totalPct() - 100) > 0.1) { setStatus("pct"); return; }
    setStatus("loading");
    const ok = await saveReport(boutique.id, month, year, form);
    setStatus(ok ? "success" : "saveerror");
    if (ok) setExisting(form);
  };

  const pieData = [
    { name: "Accessoires", value: parseFloat(form.accessoires) || 0 },
    { name: "Smartphones", value: parseFloat(form.smartphones) || 0 },
    { name: "Réparations", value: parseFloat(form.reparations) || 0 },
  ].filter(d => d.value > 0);

  // Évolutions boutique
  const evolCA_m = calcEvol(form.ca, prevM?.ca);
  const evolCA_y = calcEvol(form.ca, prevY?.ca);
  const evolTickets_m = calcEvol(form.tickets, prevM?.tickets);
  const evolTickets_y = calcEvol(form.tickets, prevY?.tickets);
  const evolStock_m = calcEvol(form.stock, prevM?.stock);
  const evolStock_y = calcEvol(form.stock, prevY?.stock);
  const evolHydrogel_m = calcEvol(form.hydrogel, prevM?.hydrogel);
  const evolHydrogel_y = calcEvol(form.hydrogel, prevY?.hydrogel);

  const hasPrev = prevM || prevY;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f14", color: "#f0f0f0", fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <Header title={boutique.name} sub="Remontée mensuelle des indicateurs" />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Mois</label><select value={month} onChange={e => setMonth(+e.target.value)} style={selectStyle}>{MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Année</label><select value={year} onChange={e => setYear(+e.target.value)} style={selectStyle}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        </div>
        {existing && <AlertBox color="#4dbb7a">✓ Rapport existant pour {MONTHS[month]} {year} — vous pouvez le modifier.</AlertBox>}

        <SectionTitle>Chiffres clés</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: hasPrev ? 8 : 28 }}>
          <InputField label="CA (€)" value={form.ca} onChange={v => setForm(f => ({ ...f, ca: v }))} placeholder="12 500" />
          <InputField label="Nb. tickets" value={form.tickets} onChange={v => setForm(f => ({ ...f, tickets: v }))} placeholder="340" />
          <InputField label="Stock (€)" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} placeholder="8 200" />
        </div>

        {/* Évolutions boutique sous les chiffres */}
        {hasPrev && (parseFloat(form.ca) > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
            {["ca", "tickets", "stock"].map((field, fi) => {
              const pm = fi === 0 ? evolCA_m : fi === 1 ? evolTickets_m : evolStock_m;
              const py = fi === 0 ? evolCA_y : fi === 1 ? evolTickets_y : evolStock_y;
              return (
                <div key={field} style={{ background: "#12121e", borderRadius: 8, padding: "8px 10px", border: "1px solid #1e1e30" }}>
                  {pm !== null && <div style={{ fontSize: 11, color: "#666" }}>M-1 <Evol pct={pm} /></div>}
                  {py !== null && <div style={{ fontSize: 11, color: "#666" }}>N-1 <Evol pct={py} /></div>}
                  {pm === null && py === null && <div style={{ fontSize: 11, color: "#444" }}>Pas d'historique</div>}
                </div>
              );
            })}
          </div>
        )}

        <SectionTitle>Répartition du CA (%)</SectionTitle>
        <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 20, marginBottom: 28, border: "1px solid #2a2a3e" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <InputField label="Accessoires %" value={form.accessoires} onChange={v => setForm(f => ({ ...f, accessoires: v }))} placeholder="25" accent="#00C49F" />
            <InputField label="Smartphones %" value={form.smartphones} onChange={v => setForm(f => ({ ...f, smartphones: v }))} placeholder="35" accent="#0088FE" />
            <InputField label="Réparations %" value={form.reparations} onChange={v => setForm(f => ({ ...f, reparations: v }))} placeholder="40" accent="#FF6B35" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#8888aa" }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: Math.abs(totalPct() - 100) < 0.1 ? "#4dbb7a" : totalPct() > 100 ? "#ff4d6d" : "#f7c948" }}>{totalPct().toFixed(1)}%</span>
          </div>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#f0f0f0" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#aaa" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <SectionTitle>Découpes Hydrogel</SectionTitle>
        <div style={{ marginBottom: hasPrev && parseFloat(form.hydrogel) > 0 ? 8 : 32 }}>
          <InputField label="Nombre de découpes" value={form.hydrogel} onChange={v => setForm(f => ({ ...f, hydrogel: v }))} placeholder="48" />
        </div>
        {hasPrev && parseFloat(form.hydrogel) > 0 && (
          <div style={{ background: "#12121e", borderRadius: 8, padding: "8px 10px", border: "1px solid #1e1e30", marginBottom: 32 }}>
            {evolHydrogel_m !== null && <div style={{ fontSize: 11, color: "#666" }}>M-1 <Evol pct={evolHydrogel_m} /></div>}
            {evolHydrogel_y !== null && <div style={{ fontSize: 11, color: "#666" }}>N-1 <Evol pct={evolHydrogel_y} /></div>}
          </div>
        )}

        {status === "error" && <AlertBox color="#ff4d6d">Veuillez remplir tous les champs.</AlertBox>}
        {status === "pct" && <AlertBox color="#f7c948">La somme des % doit être égale à 100% (actuellement {totalPct().toFixed(1)}%).</AlertBox>}
        {status === "saveerror" && <AlertBox color="#ff4d6d">Erreur lors de l'enregistrement. Réessayez.</AlertBox>}
        {status === "success" && <AlertBox color="#4dbb7a">✓ Rapport envoyé pour {MONTHS[month]} {year} !</AlertBox>}
        <button onClick={handleSubmit} disabled={status === "loading"} style={{ width: "100%", padding: 16, background: status === "success" ? "#1a3a2a" : "linear-gradient(135deg, #FF6B35, #f7b235)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          {status === "loading" ? "Envoi…" : status === "success" ? "✓ Rapport envoyé" : existing ? "Mettre à jour" : "Envoyer le rapport"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ boutiques, onAdmin }) {
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [reports, setReports] = useState([]);
  const [prevMReports, setPrevMReports] = useState([]);
  const [prevYReports, setPrevYReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const years = [DEFAULT_YEAR - 1, DEFAULT_YEAR];

  useEffect(() => {
    setLoading(true);
    const pm = prevPeriod(month, year);
    const py = prevYear(month, year);
    Promise.all([
      loadAllReports(boutiques, month, year),
      loadAllReports(boutiques, pm.month, pm.year),
      loadAllReports(boutiques, py.month, py.year),
    ]).then(([r, rPm, rPy]) => {
      setReports(r); setPrevMReports(rPm); setPrevYReports(rPy); setLoading(false);
    });
  }, [month, year, boutiques]);

  const totalCA = reports.reduce((s, r) => s + (parseFloat(r.ca) || 0), 0);
  const totalTickets = reports.reduce((s, r) => s + (parseFloat(r.tickets) || 0), 0);
  const totalStock = reports.reduce((s, r) => s + (parseFloat(r.stock) || 0), 0);
  const totalHydrogel = reports.reduce((s, r) => s + (parseFloat(r.hydrogel) || 0), 0);

  const totalCA_pm = prevMReports.reduce((s, r) => s + (parseFloat(r.ca) || 0), 0);
  const totalCA_py = prevYReports.reduce((s, r) => s + (parseFloat(r.ca) || 0), 0);
  const totalTickets_pm = prevMReports.reduce((s, r) => s + (parseFloat(r.tickets) || 0), 0);
  const totalTickets_py = prevYReports.reduce((s, r) => s + (parseFloat(r.tickets) || 0), 0);
  const totalHydrogel_pm = prevMReports.reduce((s, r) => s + (parseFloat(r.hydrogel) || 0), 0);
  const totalHydrogel_py = prevYReports.reduce((s, r) => s + (parseFloat(r.hydrogel) || 0), 0);
  const totalStock_pm = prevMReports.reduce((s, r) => s + (parseFloat(r.stock) || 0), 0);
  const totalStock_py = prevYReports.reduce((s, r) => s + (parseFloat(r.stock) || 0), 0);

  const avgAcc = reports.length ? reports.reduce((s, r) => s + (parseFloat(r.accessoires) || 0), 0) / reports.length : 0;
  const avgSmart = reports.length ? reports.reduce((s, r) => s + (parseFloat(r.smartphones) || 0), 0) / reports.length : 0;
  const avgRep = reports.length ? reports.reduce((s, r) => s + (parseFloat(r.reparations) || 0), 0) / reports.length : 0;
  const pieData = [{ name: "Accessoires", value: +avgAcc.toFixed(1) }, { name: "Smartphones", value: +avgSmart.toFixed(1) }, { name: "Réparations", value: +avgRep.toFixed(1) }].filter(d => d.value > 0);
  const missing = boutiques.filter(b => !reports.find(r => r.boutiqueId === b.id));
  const sortedByCA = [...reports].sort((a, b) => (parseFloat(b.ca) || 0) - (parseFloat(a.ca) || 0));

  // Évolution CA par boutique vs mois préc et année préc
  const getBoutiqueEvol = (r) => {
    const pm = prevMReports.find(p => p.boutiqueId === r.boutiqueId);
    const py = prevYReports.find(p => p.boutiqueId === r.boutiqueId);
    return { m: calcEvol(r.ca, pm?.ca), y: calcEvol(r.ca, py?.ca) };
  };

  const medalColors = ["#f7c948", "#aaaaaa", "#cd7f32"];

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f14", color: "#f0f0f0", fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <Header
        title="Tableau de bord dirigeant"
        sub={`${reports.length}/${boutiques.length} boutiques ont soumis`}
        action={
          <button onClick={onAdmin} style={{ background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#ccc", padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
            ⚙️ Gérer les boutiques
          </button>
        }
      />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Mois</label><select value={month} onChange={e => setMonth(+e.target.value)} style={selectStyle}>{MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Année</label><select value={year} onChange={e => setYear(+e.target.value)} style={selectStyle}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#8888aa" }}>Chargement…</div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <KpiCard label="CA total réseau" value={fmt(totalCA)} color="#FF6B35"
                evolMois={totalCA_pm ? calcEvol(totalCA, totalCA_pm) : undefined}
                evolAn={totalCA_py ? calcEvol(totalCA, totalCA_py) : undefined} />
              <KpiCard label="Tickets total" value={fmtNum(totalTickets)} color="#0088FE"
                evolMois={totalTickets_pm ? calcEvol(totalTickets, totalTickets_pm) : undefined}
                evolAn={totalTickets_py ? calcEvol(totalTickets, totalTickets_py) : undefined} />
              <KpiCard label="Stock total" value={fmt(totalStock)} color="#f7c948"
                evolMois={totalStock_pm ? calcEvol(totalStock, totalStock_pm) : undefined}
                evolAn={totalStock_py ? calcEvol(totalStock, totalStock_py) : undefined} />
              <KpiCard label="Découpes Hydrogel" value={fmtNum(totalHydrogel)} color="#00C49F"
                evolMois={totalHydrogel_pm ? calcEvol(totalHydrogel, totalHydrogel_pm) : undefined}
                evolAn={totalHydrogel_py ? calcEvol(totalHydrogel, totalHydrogel_py) : undefined} />
            </div>

            {/* Camembert + Manquantes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 20, border: "1px solid #2a2a3e" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Répartition CA moyenne</div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 8, color: "#f0f0f0" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#aaa" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ color: "#8888aa", fontSize: 13, textAlign: "center", paddingTop: 60 }}>Aucune donnée</div>}
              </div>
              <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 20, border: "1px solid #2a2a3e" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#aaa", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Boutiques en attente ({missing.length})</div>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {missing.length === 0
                    ? <div style={{ color: "#4dbb7a", fontSize: 14, textAlign: "center", paddingTop: 40 }}>✓ Toutes les boutiques ont soumis !</div>
                    : missing.map(b => (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #2a2a3e", fontSize: 13, color: "#ccc" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d6d", display: "inline-block", flexShrink: 0 }}></span>
                        {b.name}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Classement CA */}
            {sortedByCA.length > 0 && (
              <div style={{ background: "#1a1a2e", borderRadius: 14, border: "1px solid #2a2a3e", overflow: "hidden", marginBottom: 28 }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a3e", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", textTransform: "uppercase", letterSpacing: 1 }}>Classement par Chiffre d'affaires</span>
                </div>
                <div>
                  {sortedByCA.map((r, i) => {
                    const { m, y } = getBoutiqueEvol(r);
                    const pct = totalCA > 0 ? ((parseFloat(r.ca) || 0) / totalCA) * 100 : 0;
                    return (
                      <div key={r.boutiqueId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < sortedByCA.length - 1 ? "1px solid #1e1e30" : "none", background: i === 0 ? "#1e1e10" : "transparent" }}>
                        {/* Rang */}
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: i < 3 ? medalColors[i] + "22" : "#12121e", border: `2px solid ${i < 3 ? medalColors[i] : "#2a2a3e"}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: i < 3 ? medalColors[i] : "#666", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        {/* Nom */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 4 }}>{r.boutiqueName}</div>
                          {/* Barre de progression */}
                          <div style={{ height: 4, background: "#12121e", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: i < 3 ? medalColors[i] : "#FF6B35", borderRadius: 2, transition: "width 0.5s" }} />
                          </div>
                        </div>
                        {/* CA + évolutions */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: i < 3 ? medalColors[i] : "#FF6B35" }}>{fmt(r.ca)}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{pct.toFixed(1)}% du réseau</div>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }}>
                            {m !== null && <span style={{ fontSize: 10, color: "#666" }}>M-1 <Evol pct={m} /></span>}
                            {y !== null && <span style={{ fontSize: 10, color: "#666" }}>N-1 <Evol pct={y} /></span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tableau détail */}
            {reports.length > 0 && (
              <div style={{ background: "#1a1a2e", borderRadius: 14, border: "1px solid #2a2a3e", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a3e" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Détail complet par boutique</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2a2a3e" }}>
                        {["#", "Boutique", "CA (€)", "Évol. CA", "Tickets", "Stock (€)", "Acc.%", "Smart.%", "Rép.%", "Hydrogel"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#8888aa", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedByCA.map((r, i) => {
                        const { m, y } = getBoutiqueEvol(r);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #1e1e30" }}>
                            <td style={{ padding: "10px 14px", color: i < 3 ? medalColors[i] : "#555", fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>{r.boutiqueName}</td>
                            <td style={{ padding: "10px 14px", color: "#FF6B35", fontWeight: 600 }}>{fmt(r.ca)}</td>
                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                              {m !== null && <div style={{ fontSize: 11 }}>M-1 <Evol pct={m} /></div>}
                              {y !== null && <div style={{ fontSize: 11 }}>N-1 <Evol pct={y} /></div>}
                              {m === null && y === null && <span style={{ color: "#444" }}>—</span>}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#ccc" }}>{fmtNum(r.tickets)}</td>
                            <td style={{ padding: "10px 14px", color: "#f7c948" }}>{fmt(r.stock)}</td>
                            <td style={{ padding: "10px 14px", color: "#00C49F" }}>{r.accessoires}%</td>
                            <td style={{ padding: "10px 14px", color: "#0088FE" }}>{r.smartphones}%</td>
                            <td style={{ padding: "10px 14px", color: "#FF6B35" }}>{r.reparations}%</td>
                            <td style={{ padding: "10px 14px", color: "#4dbb7a" }}>{fmtNum(r.hydrogel)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── App principale ───────────────────────────────────────────────────────────
export default function App() {
  const [boutiques, setBoutiques] = useState(null);
  const [view, setView] = useState("home");
  const [selectedBoutique, setSelectedBoutique] = useState(null);

  useEffect(() => { loadBoutiques().then(setBoutiques); }, []);

  if (!boutiques) return (
    <div style={{ minHeight: "100vh", background: "#0f0f14", display: "flex", alignItems: "center", justifyContent: "center", color: "#8888aa", fontFamily: "'Inter', sans-serif" }}>Chargement…</div>
  );

  if (view === "admin") return <AdminPanel boutiques={boutiques} onUpdate={b => setBoutiques(b)} onBack={() => setView("dashboard")} />;
  if (view === "boutique" && selectedBoutique) return <BoutiqueForm boutique={selectedBoutique} />;
  if (view === "dashboard") return <Dashboard boutiques={boutiques} onAdmin={() => setView("admin")} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f14", color: "#f0f0f0", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, #FF6B35, #f7c948)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26, color: "#fff", marginBottom: 16 }}>R</div>
      <div style={{ fontSize: 11, letterSpacing: 3, color: "#FF6B35", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>REPLAYCE</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Application de reporting</div>
      <div style={{ fontSize: 14, color: "#8888aa", marginBottom: 40, textAlign: "center", maxWidth: 400 }}>Remontée mensuelle des indicateurs réseau</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
        <button onClick={() => setView("dashboard")} style={{ padding: "14px 20px", background: "linear-gradient(135deg, #FF6B35, #f7b235)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          📊 Vue dirigeant
        </button>
        <div style={{ fontSize: 12, color: "#8888aa", textAlign: "center", margin: "4px 0" }}>ou accéder à une boutique</div>
        <select onChange={e => { if (e.target.value) { setSelectedBoutique(boutiques.find(b => b.id === e.target.value)); setView("boutique"); }}} style={{ ...selectStyle, padding: "14px 12px", fontSize: 14 }} defaultValue="">
          <option value="" disabled>Sélectionner une boutique…</option>
          {boutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
    </div>
  );
}
