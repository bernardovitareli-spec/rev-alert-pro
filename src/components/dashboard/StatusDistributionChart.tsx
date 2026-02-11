import { useMemo } from 'react';
import { useDashboardStats } from '@/hooks/useFleetData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = {
  critical: 'hsl(0, 72%, 51%)',
  warning: 'hsl(45, 93%, 47%)',
  ok: 'hsl(142, 71%, 45%)',
};

export function StatusDistributionChart() {
  const { data: stats, isLoading } = useDashboardStats();

  // Memoize data to prevent infinite re-renders
  const data = useMemo(() => {
    if (!stats) return [];
    
    return [
      { name: 'Vencidas', value: stats.veiculosCriticos, color: COLORS.critical },
      { name: 'Atenção', value: stats.veiculosAtencao, color: COLORS.warning },
      { name: 'Em Dia', value: stats.veiculosOk, color: COLORS.ok },
    ].filter(item => item.value > 0);
  }, [stats?.veiculosCriticos, stats?.veiculosAtencao, stats?.veiculosOk]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} veículos`, 'Quantidade']}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
