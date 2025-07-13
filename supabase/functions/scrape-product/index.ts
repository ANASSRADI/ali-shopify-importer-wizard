import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Product URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapingBeeApiKey = Deno.env.get('SCRAPING_BEE_API_KEY');
    
    if (!scrapingBeeApiKey) {
      return new Response(
        JSON.stringify({ error: 'ScrapingBee API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping product from URL:', url);

    // Call ScrapingBee API
    const apiUrl = `https://api.scrapingbee.com/api/v1/?api_key=${scrapingBeeApiKey}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      console.error('ScrapingBee API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Scraping failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = await response.text();
    console.log('Successfully scraped HTML content, length:', htmlContent.length);
    
    // Parse product data from HTML
    const productData = parseProductData(htmlContent, url);
    
    return new Response(
      JSON.stringify(productData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-product function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseProductData(html: string, url: string) {
  const productId = Math.random().toString(36).substr(2, 9);
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
  let title = titleMatch ? titleMatch[1].replace(' - AliExpress', '').trim() : 'Product Title Not Found';
  
  // Try to extract more specific product title from meta tags or h1
  const metaTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (metaTitleMatch) {
    title = metaTitleMatch[1].trim();
  }
  
  // Extract price
  let price = '$0.00';
  const pricePatterns = [
    /US \$([0-9,]+\.?[0-9]*)/i,
    /\$([0-9,]+\.?[0-9]*)/,
    /"price":"([^"]+)"/i,
    /price[^>]*>[\s]*\$?([0-9,]+\.?[0-9]*)/i
  ];
  
  for (const pattern of pricePatterns) {
    const priceMatch = html.match(pattern);
    if (priceMatch) {
      price = `$${priceMatch[1].replace(',', '')}`;
      break;
    }
  }
  
  // Extract image URL
  let imageUrl = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&h=300&fit=crop";
  const imagePatterns = [
    /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i,
    /"mainImage":"([^"]+)"/i,
    /<img[^>]*src="([^"]*alicdn[^"]*)"[^>]*>/i
  ];
  
  for (const pattern of imagePatterns) {
    const imageMatch = html.match(pattern);
    if (imageMatch) {
      imageUrl = imageMatch[1];
      // Ensure HTTPS
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }
      break;
    }
  }
  
  // Extract description
  let description = `Scraped from: ${url}`;
  const descriptionMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  if (descriptionMatch) {
    description = descriptionMatch[1].trim().substring(0, 200);
  }
  
  // Extract rating
  let rating = '0.0';
  const ratingMatch = html.match(/rating[^>]*>[\s]*([0-9]\.[0-9])/i) || 
                     html.match(/"rating":([0-9]\.[0-9])/i);
  if (ratingMatch) {
    rating = ratingMatch[1];
  }
  
  // Extract review count
  let reviews = '0';
  const reviewsMatch = html.match(/([0-9,]+)\s*reviews?/i) ||
                      html.match(/"reviewCount":([0-9,]+)/i);
  if (reviewsMatch) {
    reviews = reviewsMatch[1].replace(',', '');
  }
  
  return {
    id: productId,
    title: title,
    price: price,
    originalPrice: undefined,
    imageUrl: imageUrl,
    description: description,
    url: url,
    rating: rating,
    reviews: reviews,
    variants: ['Default']
  };
}