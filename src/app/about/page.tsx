import { HeartIcon, UsersIcon, SparklesIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-earth-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-market-600 to-market-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About Our Online Service
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Connecting you to the Duvall Farmers Market with convenient online ordering and delivery
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-6">Our Mission</h2>
          <p className="text-lg text-earth-600 max-w-3xl mx-auto leading-relaxed">
            Our online service bridges the gap between busy modern life and the wonderful community tradition 
            of the Duvall Farmers Market. We make it easy for families to access fresh, local foods and 
            handmade treasures through convenient online ordering, with delivery right to your door during 
            market hours. Supporting local vendors has never been more accessible.
          </p>
          <div className="mt-6 p-4 bg-market-50 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-market-700">
              <strong>Want to learn about the physical market?</strong><br />
              Visit the official Duvall Farmers Market website at{' '}
              <a href="https://duvallfarmersmarket.org/" target="_blank" rel="noopener noreferrer" className="text-market-600 hover:text-market-800 font-medium underline">
                duvallfarmersmarket.org
              </a>
            </p>
          </div>
        </div>

        {/* Values Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Convenience</h3>
            <p className="text-earth-600">
              Shop from home and have fresh, local goods delivered during market hours.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Support Local</h3>
            <p className="text-earth-600">
              Helping local vendors reach more customers and grow their businesses digitally.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Accessibility</h3>
            <p className="text-earth-600">
              Making the farmers market accessible to everyone, regardless of schedule.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPinIcon className="h-8 w-8 text-market-600" />
            </div>
            <h3 className="text-xl font-semibold text-earth-800 mb-2">Technology</h3>
            <p className="text-earth-600">
              Using modern technology to preserve and extend traditional market values.
            </p>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-6 text-center">How It Started</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-earth-600 mb-4">
                The Duvall Farmers Market has been bringing folks together since May 2006 at 
                Taylor Landing Park, creating a beloved weekly tradition of fresh foods, 
                handmade treasures, and community connection.
              </p>
              <p className="text-earth-600 mb-4">
                Founded in 2025, our online service was created to help local vendors branch 
                out beyond just the physical market. We recognized that many families wanted 
                to support local businesses but couldn't always make it to the Thursday market 
                due to work schedules, family commitments, or other constraints.
              </p>
              <p className="text-earth-600">
                Our digital platform preserves the personal touch of the farmers market while 
                adding modern convenience. Vendors can showcase their products online, customers 
                can shop from home, and we deliver fresh, local goods right to your door during 
                market hours - bridging traditional community commerce with today's lifestyle needs.
              </p>
            </div>
            <div className="bg-earth-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Online Service Facts</h3>
              <ul className="space-y-2 text-earth-600">
                <li><strong>Launched:</strong> 2025</li>
                <li><strong>Delivery Days:</strong> Thursdays, 3:00 PM - 6:30 PM</li>
                <li><strong>Payment:</strong> Secure card-only transactions</li>
                <li><strong>Vendor Support:</strong> Square & Swipe integration</li>
                <li><strong>Delivery Area:</strong> Greater Duvall region</li>
                <li><strong>Mission:</strong> Connecting community through convenience</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-earth-800 mb-8 text-center">How Our Service Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-market-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Browse & Order</h3>
              <p className="text-earth-600">
                Shop online from participating vendors. View products, read descriptions, 
                and add items to your cart from multiple vendors at once.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-market-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Secure Payment</h3>
              <p className="text-earth-600">
                Pay safely with your credit or debit card. We use secure payment processing 
                integrated with each vendor's Square or Swipe system.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-market-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-market-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Thursday Delivery</h3>
              <p className="text-earth-600">
                Receive your fresh, local goods delivered to your door every Thursday 
                between 3:00 PM and 6:30 PM during market hours.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-market-50 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-earth-800 mb-6">Get Started</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Delivery Schedule</h3>
              <p className="text-earth-600 mb-2">Every Thursday</p>
              <p className="text-earth-600 mb-4">3:00 PM - 6:30 PM</p>
              <p className="text-sm text-earth-500">Same day as the physical market</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-earth-800 mb-4">Service Area</h3>
              <p className="text-earth-600 mb-2">Greater Duvall Region</p>
              <p className="text-earth-600 mb-4">Delivery to your door</p>
              <p className="text-sm text-earth-500">Card-only payments accepted</p>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-market-200">
            <p className="text-earth-600 mb-4">
              Questions about our online service or interested in becoming a vendor?
            </p>
            <p className="text-earth-600 mb-4">
              Email us at <a href="mailto:info@duvallmarket.com" className="text-market-600 hover:text-market-700 font-medium">info@duvallmarket.com</a>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="/shop" 
                className="bg-market-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-market-700 transition-colors"
              >
                Start Shopping Online
              </a>
              <a 
                href="/vendor-signup" 
                className="bg-white text-market-600 border-2 border-market-600 px-8 py-3 rounded-lg font-medium hover:bg-market-50 transition-colors"
              >
                Become a Vendor
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 