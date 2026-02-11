import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useCompanyStats, CompanyStats } from '@/hooks/useCompanyStats';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2,
  Truck,
  FileWarning,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/exportUtils';

function CompanyRow({ company, maxGasto }: { company: CompanyStats; maxGasto: number }) {
  const gastoPercentual = maxGasto > 0 ? (company.gastoMesAtual / maxGasto) * 100 : 0;
  const hasIssues = company.veiculosCriticos > 0 || company.percentualConformidade < 80;

  return (
    <Link 
      to={`/veiculos?empresa=${company.id}`}
      className="block"
    >
      <div className={cn(
        "p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-primary/30",
        hasIssues ? "bg-gradient-to-r from-status-critical/5 to-transparent" : "bg-card"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm truncate max-w-[120px]">
              {company.nome}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {company.veiculosCriticos > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                {company.veiculosCriticos}
              </Badge>
            )}
            {company.veiculosAtencao > 0 && (
              <Badge className="bg-status-warning text-white text-xs px-1.5">
                <AlertCircle className="h-3 w-3 mr-0.5" />
                {company.veiculosAtencao}
              </Badge>
            )}
            {company.veiculosOk > 0 && (
              <Badge className="bg-status-ok text-white text-xs px-1.5">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                {company.veiculosOk}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{company.totalVeiculos} veículos</span>
          </div>
          <div className="flex items-center gap-1">
            <FileWarning className={cn(
              "h-3 w-3",
              company.percentualConformidade < 80 ? "text-status-critical" : "text-muted-foreground"
            )} />
            <span className={cn(
              company.percentualConformidade < 80 ? "text-status-critical font-medium" : "text-muted-foreground"
            )}>
              {company.percentualConformidade.toFixed(0)}% docs
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">
              {formatCurrency(company.gastoMesAtual)}
            </span>
          </div>
        </div>

        {gastoPercentual > 0 && (
          <div className="mt-2">
            <Progress value={gastoPercentual} className="h-1" />
          </div>
        )}
      </div>
    </Link>
  );
}

export function CompanyComparisonCard() {
  const { data: companies, isLoading } = useCompanyStats();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxGasto = Math.max(...(companies?.map(c => c.gastoMesAtual) || [0]));
  const totalCriticos = companies?.reduce((sum, c) => sum + c.veiculosCriticos, 0) || 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Comparativo por Empresa
          </CardTitle>
          {totalCriticos > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalCriticos} veículos críticos
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!companies || companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma empresa cadastrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {companies.map(company => (
                <CompanyRow key={company.id} company={company} maxGasto={maxGasto} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
