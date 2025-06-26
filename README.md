# Duvall Farmers Market Online Service

A modern, responsive web application for the Duvall Farmers Market Online Service, built with Next.js, TypeScript, and Tailwind CSS. This platform allows customers to browse vendors, view products, place orders online, and pick them up at the market.

## 🚀 Quick Deploy

Deploy this website instantly to the web with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/duvall-farmers-market)

## 🌐 Live Demo

Once deployed, your website will be available 24/7 at your custom domain!

## Features

### Customer Features
- **Market Status Display**: Shows whether the market is currently open or when the next market date is
- **Product Categories**: Browse vendors by product type (produce, baked goods, crafts, etc.)
- **Vendor-Specific Shopping**: Separate carts for each vendor with individual checkout
- **Market Calendar**: View all upcoming Thursday market dates
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### Vendor Features
- **Vendor Registration**: Comprehensive signup form with product type selection
- **Date Selection**: Choose which market dates to attend
- **Payment Method Configuration**: Specify accepted payment methods (card, cash, or both)
- **API Integration Consent**: Option to integrate with payment processing systems

### Admin Features
- **Market Date Management**: Add and manage market dates
- **Vendor Management**: Review and approve vendor applications
- **Product Management**: Upload and manage vendor product images and information

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom earth-tone color palette
- **State Management**: Zustand for client-side state
- **Database**: Supabase (PostgreSQL)
- **Forms**: React Hook Form with validation
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd duvall-farmers-market
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Admin Configuration
   ADMIN_PASSWORD=your_admin_password

   # Market Configuration
   NEXT_PUBLIC_MARKET_NAME=Duvall Farmers Market Online Service
   NEXT_PUBLIC_MARKET_DAY=thursday
   NEXT_PUBLIC_MARKET_END_TIME=18:30
   ```

4. **Set up Supabase Database**
   
   Create the following tables in your Supabase database:

   ```sql
   -- Vendors table
   CREATE TABLE vendors (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     contact_email TEXT NOT NULL,
     contact_phone TEXT NOT NULL,
     product_type TEXT NOT NULL,
     api_consent BOOLEAN NOT NULL DEFAULT false,
     payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash', 'both')),
     available_dates TEXT[] NOT NULL DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Products table
   CREATE TABLE products (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     description TEXT,
     price DECIMAL(10,2) NOT NULL,
     image_url TEXT,
     category TEXT NOT NULL,
     available BOOLEAN NOT NULL DEFAULT true,
     stock_quantity INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Market dates table
   CREATE TABLE market_dates (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     date DATE NOT NULL UNIQUE,
     is_active BOOLEAN NOT NULL DEFAULT true,
     start_time TIME NOT NULL DEFAULT '15:00',
     end_time TIME NOT NULL DEFAULT '18:30',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Orders table
   CREATE TABLE orders (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
     customer_email TEXT NOT NULL,
     customer_phone TEXT NOT NULL,
     items JSONB NOT NULL,
     total DECIMAL(10,2) NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
     order_date DATE NOT NULL,
     pickup_time TIME,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── about/             # About us page
│   ├── calendar/          # Market calendar page
│   ├── cart/              # Shopping cart page
│   ├── vendor-signup/     # Vendor registration page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   └── Navigation.tsx     # Main navigation component
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client configuration
│   └── utils.ts          # Utility functions
├── store/                 # State management
│   └── marketStore.ts    # Zustand store for market data
└── types/                 # TypeScript type definitions
    └── index.ts          # Main type definitions
```

## Key Features Explained

### Market Status Logic
The application automatically determines if the market is currently open based on:
- Current day is Thursday
- Current time is before 6:30 PM
- Displays appropriate messaging and available actions

### Vendor-Specific Carts
- Each vendor has a separate cart
- Customers check out with each vendor individually
- Payment processing happens at the vendor level
- Orders are validated for availability before confirmation

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Custom color palette with earth tones and market greens
- Accessible navigation with mobile hamburger menu
- Optimized for all screen sizes

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please contact:
- Email: info@duvallmarket.com
- Website: [Duvall Farmers Market Online Service](https://duvallmarket.com)

## Acknowledgments

- Built for the Duvall community
- Inspired by local farmers markets and sustainable agriculture
- Designed with accessibility and user experience in mind 