import { AppLayout } from '@/components/layout/AppLayout';
import { ImportExcel } from '@/components/import/ImportExcel';

export default function Importar() {
  return (
    <AppLayout title="Importar Dados">
      <ImportExcel />
    </AppLayout>
  );
}
