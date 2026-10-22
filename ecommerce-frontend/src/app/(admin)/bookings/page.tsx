import AdminBookings from "@/components/products/AdminBookings";
import RideRequestsList from "@/components/products/RideRequestsList";
import RidePricingEditor from "@/components/products/RidePricingEditor";
export default function Page() { return <div className="space-y-6"><RidePricingEditor /><RideRequestsList admin /><AdminBookings /></div>; }
