
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, Trash2, ExternalLink, Package, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  description: string;
  url: string;
  rating?: string;
  reviews?: string;
  variants?: string[];
}

const Index = () => {
  const [urls, setUrls] = useState<string[]>(['']);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const addUrlInput = () => {
    setUrls([...urls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const scrapeProductData = async (url: string): Promise<Product> => {
    const productId = Math.random().toString(36).substr(2, 9);
    
    try {
      // Try to extract product info from AliExpress URL using a scraping service
      // For now, we'll use a demo scraping API - replace with your actual backend
      const response = await fetch('https://api.scrapingbee.com/api/v1/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: 'YOUR_SCRAPING_BEE_API_KEY', // Replace with actual API key
          url: url,
          extract_rules: {
            title: '.product-title-text',
            price: '.product-price-current',
            originalPrice: '.product-price-original',
            description: '.product-description',
            imageUrl: '.product-image img@src',
            rating: '.overview-rating-average',
            reviews: '.review-count'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const data = await response.json();
      
      return {
        id: productId,
        title: data.title || 'Product Title Not Found',
        price: data.price || '$0.00',
        originalPrice: data.originalPrice || undefined,
        imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop",
        description: data.description || 'Product description not available',
        url: url,
        rating: data.rating || '0.0',
        reviews: data.reviews || '0',
        variants: ['Default']
      };
    } catch (error) {
      console.error('Error scraping product:', error);
      
      // Fallback to basic URL analysis if scraping fails
      toast({
        title: "Scraping unavailable",
        description: "Real scraping requires a backend service. Using URL analysis instead.",
        variant: "destructive",
      });
      
      return {
        id: productId,
        title: `Product from ${new URL(url).hostname}`,
        price: '$0.00',
        originalPrice: undefined,
        imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop",
        description: `Product URL: ${url}`,
        url: url,
        rating: '0.0',
        reviews: '0',
        variants: ['Default']
      };
    }
  };

  const scrapeProducts = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      toast({
        title: "No URLs provided",
        description: "Please enter at least one AliExpress product URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setProducts([]);

    console.log("Starting product scraping for URLs:", validUrls);

    try {
      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        console.log(`Scraping product ${i + 1}/${validUrls.length}: ${url}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const product = await scrapeProductData(url);
        setProducts(prev => [...prev, product]);
        setProgress(((i + 1) / validUrls.length) * 100);
      }

      toast({
        title: "Scraping completed!",
        description: `Successfully scraped ${validUrls.length} products`,
      });
    } catch (error) {
      console.error("Error during scraping:", error);
      toast({
        title: "Scraping failed",
        description: "An error occurred while scraping products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToShopify = () => {
    if (products.length === 0) {
      toast({
        title: "No products to export",
        description: "Please scrape some products first",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = [
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type',
      'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name',
      'Option2 Value', 'Option3 Name', 'Option3 Value', 'Variant SKU',
      'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
      'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price',
      'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
      'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text',
      'Gift Card', 'SEO Title', 'SEO Description', 'Google Shopping',
      'Google Shopping - Google Product Category', 'Google Shopping - Gender',
      'Google Shopping - Age Group', 'Google Shopping - MPN',
      'Google Shopping - AdWords Grouping', 'Google Shopping - AdWords Labels',
      'Google Shopping - Condition', 'Google Shopping - Custom Product',
      'Google Shopping - Custom Label 0', 'Google Shopping - Custom Label 1',
      'Google Shopping - Custom Label 2', 'Google Shopping - Custom Label 3',
      'Google Shopping - Custom Label 4', 'Variant Image', 'Variant Weight Unit',
      'Variant Tax Code', 'Cost per item', 'Status'
    ];

    const csvRows = products.map(product => [
      product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      product.title,
      product.description,
      'AliExpress Import',
      '',
      '',
      'imported, aliexpress',
      'TRUE',
      'Color',
      product.variants?.[0] || 'Default',
      '',
      '',
      '',
      '',
      product.id,
      '0',
      '',
      '100',
      'deny',
      'manual',
      product.price.replace('$', ''),
      product.originalPrice?.replace('$', '') || '',
      'TRUE',
      'TRUE',
      '',
      product.imageUrl,
      '1',
      product.title,
      'FALSE',
      product.title,
      product.description.substring(0, 160),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'new',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'lb',
      '',
      '',
      'active'
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shopify-products-import.csv';
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful!",
      description: "Shopify CSV file has been downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AliExpress to Shopify Scraper
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Extract product data from AliExpress and export it directly to your Shopify store
          </p>
        </div>

        {/* URL Input Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Product URLs
            </CardTitle>
            <CardDescription>
              Enter AliExpress product URLs you want to scrape
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="https://www.aliexpress.com/item/..."
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  className="flex-1"
                />
                {urls.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeUrl(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={addUrlInput}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add URL
              </Button>
              <Button
                onClick={scrapeProducts}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isLoading ? "Scraping..." : "Start Scraping"}
              </Button>
            </div>

            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Scraping progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        {products.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Scraped Products ({products.length})
              </h2>
              <Button
                onClick={exportToShopify}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export to Shopify CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="shadow-md hover:shadow-lg transition-shadow bg-white/90 backdrop-blur">
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {product.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-green-600">
                        {product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.originalPrice}
                        </span>
                      )}
                    </div>

                    {product.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {product.variants && (
                      <div className="flex gap-1 mb-3">
                        {product.variants.slice(0, 3).map((variant, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {variant}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(product.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Original
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-3">How it works:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="bg-white/20 rounded-full p-1 mt-0.5">
                  <span className="text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium">Add URLs</p>
                  <p className="opacity-90">Paste AliExpress product URLs</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-white/20 rounded-full p-1 mt-0.5">
                  <span className="text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium">Scrape Data</p>
                  <p className="opacity-90">Extract product information</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-white/20 rounded-full p-1 mt-0.5">
                  <span className="text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium">Export CSV</p>
                  <p className="opacity-90">Import directly to Shopify</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
