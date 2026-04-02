import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, DollarSign, Image as ImageIcon, FileText, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchMercadoLivreAddresses,
  createMercadoLivreItem,
  type MeliAddress,
} from "@/lib/mercadoLivre";
import { useIntegrations } from "@/hooks/useMarketplaces";

interface ProductForm {
  title: string;
  category_id: string;
  price: string;
  currency_id: string;
  available_quantity: string;
  buying_mode: string;
  listing_type_id: string;
  condition: string;
  description: string;
  pictures: string[];
}

const AdicionarProdutoML = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [addresses, setAddresses] = useState<MeliAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  const [formData, setFormData] = useState<ProductForm>({
    title: "",
    category_id: "MLB1499", // Ferramentas
    price: "",
    currency_id: "BRL",
    available_quantity: "",
    buying_mode: "buy_it_now",
    listing_type_id: "gold_special",
    condition: "new",
    description: "",
    pictures: [],
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const { data: integrations = [] } = useIntegrations();
  const mlIntegration = integrations.find((i) => i.marketplace === "mercadolivre" && i.isActive);

  // Buscar endereços ao carregar
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!mlIntegration) return;

      try {
        const data = await fetchMercadoLivreAddresses();
        setAddresses(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedAddressId(String(data[0].id));
        }
      } catch (error) {
        console.error("Erro ao buscar endereços:", error);
        // Não mostra toast, apenas deixa o campo manual disponível
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [mlIntegration]);

  if (!mlIntegration) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/integracoes")}>
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6 text-center">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Mercado Livre não conectado</h3>
            <p className="text-muted-foreground mb-4">
              Você precisa conectar sua conta do Mercado Livre antes de adicionar produtos.
            </p>
            <Button onClick={() => navigate("/integracoes")}>
              Conectar Mercado Livre
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddImage = () => {
    if (imageUrl.trim() && formData.pictures.length < 10) {
      setFormData((prev) => ({
        ...prev,
        pictures: [...prev.pictures, imageUrl.trim()],
      }));
      setImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.available_quantity) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, preço e quantidade.",
        variant: "destructive",
      });
      return;
    }

    if (formData.pictures.length === 0) {
      toast({
        title: "Imagem obrigatória",
        description: "Adicione pelo menos uma imagem do produto.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddressId) {
      toast({
        title: "Endereço obrigatório",
        description: "Selecione um endereço de origem para o produto.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (!selectedAddressId) {
        throw new Error("Informe o ID do endereço. Veja em: https://www.mercadolivre.com.br/vendas/configuracao/dados");
      }

      // Payload principal (sem descrição)
      const payload: Record<string, unknown> = {
        title: formData.title,
        category_id: formData.category_id,
        price: parseFloat(formData.price),
        currency_id: formData.currency_id,
        available_quantity: parseInt(formData.available_quantity),
        buying_mode: formData.buying_mode,
        listing_type_id: formData.listing_type_id,
        condition: formData.condition,
        description: formData.description.trim()
          ? { plain_text: formData.description.trim() }
          : undefined,
        pictures: formData.pictures.map((url) => ({ source: url })),
        seller_address: {
          id: parseInt(selectedAddressId)
        },
        sale_terms: [
          {
            id: "WARRANTY_TYPE",
            value_name: "Garantia do vendedor"
          },
          {
            id: "WARRANTY_TIME",
            value_name: "90 dias"
          }
        ]
      };

      // Criar o item
      const data = await createMercadoLivreItem(payload);

      toast({
        title: "Produto criado com sucesso!",
        description: `ID: ${data.id} - ${data.title}`,
      });

      navigate("/integracoes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar produto";
      
      let userMessage = message;
      if (message.includes('address_pending')) {
        userMessage = "Você precisa cadastrar um endereço na sua conta do Mercado Livre. Acesse: https://www.mercadolivre.com.br/vendas/configuracao/dados";
      } else if (message.includes('unable_to_list')) {
        userMessage = "Sua conta não está habilitada para publicar. Verifique pendências em: https://www.mercadolivre.com.br/vendas/configuracao";
      }
      
      toast({
        title: "Falha ao criar produto",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate("/integracoes")} className="mb-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground">Adicionar Produto no Mercado Livre</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conta conectada: {mlIntegration.shopName || mlIntegration.shopId}
          </p>
        </div>
      </div>

      {/* Seleção de Endereço */}
      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Endereço de Origem</CardTitle>
          <CardDescription>
            {addresses.length > 0 
              ? "Selecione o endereço de onde o produto será enviado"
              : "Informe o ID do seu endereço cadastrado no Mercado Livre"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingAddresses ? (
            <div className="text-center py-4">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-sm text-muted-foreground">Carregando endereços...</p>
            </div>
          ) : addresses.length > 0 ? (
            <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um endereço" />
              </SelectTrigger>
              <SelectContent>
                {addresses.map((addr) => (
                  <SelectItem key={addr.id} value={String(addr.id)}>
                    {addr.address_line}, {addr.city?.name} - {addr.state?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="addressId">ID do Endereço</Label>
              <Input
                id="addressId"
                placeholder="Ex: 1126268188"
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              />
              <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Como encontrar o ID do endereço:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Acesse: <a href="https://www.mercadolivre.com.br/vendas/configuracao/dados" target="_blank" rel="noopener" className="text-primary hover:underline">Configurações de Vendas</a></li>
                  <li>Veja seu endereço cadastrado</li>
                  <li>O ID aparece na URL ou nos detalhes</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package size={20} />
                  Informações Básicas
                </CardTitle>
                <CardDescription>Dados principais do produto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Produto *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Furadeira de Impacto 750W Profissional"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{formData.title.length}/60 caracteres</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condição *</Label>
                    <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="used">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MLB1499">Ferramentas</SelectItem>
                        <SelectItem value="MLB1500">Construção</SelectItem>
                        <SelectItem value="MLB1648">Informática</SelectItem>
                        <SelectItem value="MLB1051">Celulares</SelectItem>
                        <SelectItem value="MLB5726">Eletrodomésticos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as características, especificações técnicas, garantia, etc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Imagens */}
            <Card className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon size={20} />
                  Imagens do Produto
                </CardTitle>
                <CardDescription>Adicione até 10 imagens (URL)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole a URL da imagem"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImage())}
                  />
                  <Button type="button" onClick={handleAddImage} disabled={formData.pictures.length >= 10}>
                    Adicionar
                  </Button>
                </div>

                {formData.pictures.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {formData.pictures.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Produto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-border"
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/300x300?text=Erro";
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          Remover
                        </Button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                            Principal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Preço e Estoque */}
            <Card className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  Preço e Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.available_quantity}
                    onChange={(e) => setFormData({ ...formData, available_quantity: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Anúncio */}
            <Card className="gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} />
                  Tipo de Anúncio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listing_type">Tipo *</Label>
                  <Select value={formData.listing_type_id} onValueChange={(value) => setFormData({ ...formData, listing_type_id: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold_special">Clássico</SelectItem>
                      <SelectItem value="gold_pro">Premium</SelectItem>
                      <SelectItem value="free">Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Dica:</p>
                  <p>Anúncios Premium têm mais destaque e melhores posições nos resultados de busca.</p>
                </div>
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="space-y-3">
              <Button type="submit" className="w-full" disabled={isSubmitting || !selectedAddressId}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Package size={16} />
                    Publicar Produto
                  </>
                )}
              </Button>
              {!selectedAddressId && (
                <p className="text-xs text-center text-destructive">
                  Cadastre um endereço para publicar
                </p>
              )}
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/integracoes")} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdicionarProdutoML;
