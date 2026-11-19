import HeroBanner from '@/components/home/HeroBanner';  
import TrustBadges from '@/components/home/TrustBadges';
import FeaturedProducts from '@/components/home/FeaturedProducts';  
import CategoryGrid from '@/components/home/CategoryGrid';  
import HomeCTABanner from '@/components/home/HomeCTABanner';  
  
export default function HomePage() {  
  return (  
    <>  
      <HeroBanner />  
      <TrustBadges />
      <FeaturedProducts />  
      <CategoryGrid />  
      <HomeCTABanner />  
    </>  
  );  
} 
