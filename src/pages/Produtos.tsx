import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Eye, Filter, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import imgChavesAllen from "@/assets/products/chaves-allen.jpg";
import imgFuradeira from "@/assets/products/furadeira.jpg";
import imgParafusos from "@/assets/products/parafusos-kit.jpg";
import imgSerraCircular from "@/assets/products/serra-circular.jpg";
import imgNivelLaser from "@/assets/products/nivel-laser.jpg";
import imgAlicate from "@/assets/products/alicate.jpg";
import imgParafusadeira from "@/assets/products/parafusadeira.jpg";
import imgTrena from "@/assets/products/trena.jpg";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: "Ativo" | "Inativo" | "Sem Estoque";
  image?: string;
}

const initialProducts: Product[] = [
  { id: "1", name: "Jogo de Chaves Allen 9pcs", sku: "FT-AL-001", category: "Chaves", price: 29.90, stock: 150, status: "Ativo", image: imgChavesAllen },
  { id: "2", name: "Furadeira de Impacto 750W", sku: "FT-FU-002", category: "Furadeiras", price: 289.90, stock: 42, status: "Ativo", image: imgFuradeira },
  { id: "3", name: "Kit Parafusos Sextavados 200pcs", sku: "FT-PF-003", category: "Parafusos", price: 49.90, stock: 380, status: "Ativo", image: imgParafusos },
  { id: "4", name: "Serra Circular 7¼\" 1400W", sku: "FT-SC-004", category: "Serras", price: 459.90, stock: 18, status: "Ativo", image: imgSerraCircular },
  { id: "5", name: "Nível a Laser 15m", sku: "FT-NL-005", category: "Medição", price: 189.90, stock: 0, status: "Sem Estoque", image: imgNivelLaser },
  { id: "6", name: "Alicate Universal 8\"", sku: "FT-AP-006", category: "Alicates", price: 34.90, stock: 220, status: "Ativo", image: imgAlicate },
  { id: "7", name: "Parafusadeira 12V Bivolt", sku: "FT-PD-007", category: "Parafusadeiras", price: 199.90, stock: 65, status: "Ativo", image: imgParafusadeira },
  { id: "8", name: "Trena Magnética 5m", sku: "FT-TR-008", category: "Medição", price: 19.90, stock: 0, status: "Sem Estoque", image: imgTrena },
];

const categories = ["Chaves", "Furadeiras", "Parafusos", "Serras", "Medição", "Alicates", "Parafusadeiras", "Brocas", "Discos"];

const statusStyles: Record<string, string> = {
  "Ativo": "bg-success/15 text-success",
  "Inativo": "bg-muted text-muted-foreground",
  "Sem Estoque": "bg-destructive/15 text-destructive",
};

const Produtos = () => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: "", sku: "", category: "", price: "", stock: "", status: "Ativo" as Product["status"] });

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: "", sku: "", category: "", price: "", stock: "", status: "Ativo" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, price: p.price.toString(), stock: p.stock.toString(), status: p.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.sku || !form.category || !form.price) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (editingProduct) {
      setProducts(products.map((p) => p.id === editingProduct.id ? { ...p, ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 } : p));
      toast({ title: "Produto atualizado com sucesso!" });
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: form.name,
        sku: form.sku,
        category: form.category,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        status: form.status,
      };
      setProducts([newProduct, ...products]);
      toast({ title: "Produto adicionado com sucesso!" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    toast({ title: "Produto removido" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus size={18} /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome do Produto *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Chave Phillips 6mm" className="mt-1" />
                </div>
                <div>
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="FT-XX-000" className="mt-1" />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Product["status"] })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Sem Estoque">Sem Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingProduct ? "Salvar" : "Adicionar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter size={14} className="mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="gradient-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-4 font-medium">Produto</th>
              <th className="text-left p-4 font-medium">SKU</th>
              <th className="text-left p-4 font-medium">Categoria</th>
              <th className="text-right p-4 font-medium">Preço</th>
              <th className="text-right p-4 font-medium">Estoque</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="p-4 text-sm text-muted-foreground">{p.category}</td>
                <td className="p-4 text-sm text-right font-medium">R$ {p.price.toFixed(2)}</td>
                <td className="p-4 text-sm text-right">
                  <span className={p.stock === 0 ? "text-destructive font-medium" : p.stock < 20 ? "text-warning" : ""}>{p.stock}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[p.status]}`}>{p.status}</span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum produto encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Produtos;
