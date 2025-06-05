import { HeartIcon, UsersIcon, SparklesIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-earth-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-market-600 to-market-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About Duvall Farmers Market
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Connecting our community through fresh, local food and artisan goods since 2010
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-6">Our Mission</h2>
          <p className="text-lg text-earth-600 max-w-3xl mx-auto leading-relaxed">
            The Duvall Farmers Market exists to strengthen our local community by providing a vibrant 
            marketplace where local farmers, artisans, and food producers can connect directly with 
            neighbors and visitors. We believe in supporting sustainable agriculture, promoting local 
            economic growth, and fostering relationships that make our community stronger.
          </p>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Sustainability</h3>
            <p className="text-earth-600">
              Supporting environmentally responsible farming practices and reducing food miles.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Community</h3>
            <p className="text-earth-600">
              Building connections between producers and consumers in our local area.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Quality</h3>
            <p className="text-earth-600">
              Ensuring the highest quality fresh produce and handcrafted goods.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPinIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Local Focus</h3>
            <p className="text-earth-600">
              Prioritizing vendors and producers from the greater Duvall area.
            </p>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-6 text-center">Our Story</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-earth-600 mb-4">
                The Duvall Farmers Market began in 2010 as a small gathering of local farmers 
                who wanted to sell their fresh produce directly to their neighbors. What started 
                with just five vendors has grown into a thriving weekly market featuring over 
                20 local businesses.
              </p>
              <p className="text-earth-600 mb-4">
                Located in the heart of Duvall at the Civic Center, our market has become a 
                beloved community tradition. Every Thursday afternoon, families, friends, and 
                neighbors gather to shop for fresh, local goods while enjoying the vibrant 
                atmosphere of our small town.
              </p>
              <p className="text-earth-600">
                In 2024, we launched our online ordering system to make it even easier for 
                busy families to access fresh, local food. Customers can now browse vendor 
                offerings, place orders online, and pick them up at the market.
              </p>
            </div>
            <div className="bg-earth-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Market Facts</h3>
              <ul className="space-y-2 text-earth-600">
                <li><strong>Established:</strong> 2010</li>
                <li><strong>Location:</strong> Duvall Civic Center</li>
                <li><strong>Schedule:</strong> Every Thursday, 3:00 PM - 6:30 PM</li>
                <li><strong>Vendors:</strong> 20+ local businesses</li>
                <li><strong>Season:</strong> Year-round operation</li>
                <li><strong>Visitors:</strong> 500+ weekly customers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-8 text-center">What You'll Find</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Fresh Produce</h3>
              <ul className="text-earth-600 space-y-2">
                <li>• Seasonal fruits and vegetables</li>
                <li>• Organic and conventional options</li>
                <li>• Herbs and microgreens</li>
                <li>• Farm-fresh eggs</li>
                <li>• Locally grown flowers</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Artisan Foods</h3>
              <ul className="text-earth-600 space-y-2">
                <li>• Fresh baked breads and pastries</li>
                <li>• Local honey and maple syrup</li>
                <li>• Artisan cheeses and dairy</li>
                <li>• Homemade jams and preserves</li>
                <li>• Specialty sauces and condiments</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Handcrafted Goods</h3>
              <ul className="text-earth-600 space-y-2">
                <li>• Handmade soaps and skincare</li>
                <li>• Local artwork and crafts</li>
                <li>• Pottery and ceramics</li>
                <li>• Jewelry and accessories</li>
                <li>• Seasonal decorations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-market-50 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-earth-800 mb-6">Visit Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Market Hours</h3>
              <p className="text-earth-600 mb-2">Every Thursday</p>
              <p className="text-earth-600 mb-4">3:00 PM - 6:30 PM</p>
              <p className="text-sm text-earth-500">Rain or shine, year-round</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Location</h3>
              <p className="text-earth-600 mb-2">Duvall Civic Center</p>
              <p className="text-earth-600 mb-4">15535 Main St NE<br />Duvall, WA 98019</p>
              <p className="text-sm text-earth-500">Free parking available</p>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-market-200">
            <p className="text-earth-600 mb-4">
              Questions about the market or interested in becoming a vendor?
            </p>
            <p className="text-earth-600">
              Email us at <a href="mailto:info@duvallmarket.com" className="text-market-600 hover:text-market-700 font-medium">info@duvallmarket.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 