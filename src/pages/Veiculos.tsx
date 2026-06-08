import { AppLayout } from '@/components/layout/AppLayout';
import { VehiclesList } from '@/components/vehicles/VehiclesList';
import { ApontadorVehicleList } from '@/components/vehicles/ApontadorVehicleList';
import { useUserRole } from '@/hooks/useUserRole';

export default function Veiculos() {
  const { isApontador } = useUserRole();
  return (
    <AppLayout title="Veículos">
      {isApontador ? <ApontadorVehicleList /> : <VehiclesList />}
    </AppLayout>
  );
}
