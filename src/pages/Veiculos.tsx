import { AppLayout } from '@/components/layout/AppLayout';
import { VehiclesList } from '@/components/vehicles/VehiclesList';

export default function Veiculos() {
  return (
    <AppLayout title="Veículos">
      <VehiclesList />
    </AppLayout>
  );
}
